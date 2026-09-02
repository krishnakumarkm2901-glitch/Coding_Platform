import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models.db import init_db

from werkzeug.middleware.proxy_fix import ProxyFix

# Import Blueprints
from routes.auth import auth_bp
from routes.students import students_bp
from routes.problems import problems_bp
from routes.submissions import submissions_bp
from routes.mcqs import mcqs_bp
from routes.contests import contests_bp
from routes.admin import admin_bp
from routes.notifications import notifications_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Support reverse proxy headers (Render/Vercel HTTPS)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Setup CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
        expose_headers=["Content-Disposition", "Content-Type"]
    )

    # Initialize Database
    with app.app_context():
        init_db(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(problems_bp, url_prefix="/api/problems")
    app.register_blueprint(submissions_bp, url_prefix="/api/submissions")
    app.register_blueprint(mcqs_bp, url_prefix="/api/mcqs")
    app.register_blueprint(contests_bp, url_prefix="/api/contests")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

    @app.route("/")
    def index():
        return jsonify({
            "service": "College Coding Platform API",
            "status": "Online",
            "version": "1.0.0"
        })


    @app.route("/api/health")
    def health_check():
        from services.cache_service import cache
        from services.compiler_pool import compiler_pool
        from services.queue_service import get_queue_stats
        from utils.time_utils import get_utc_now, format_utc_iso
        from models.db import get_db

        db_healthy = False
        try:
            db = get_db()
            db.command("ping")
            db_healthy = True
        except Exception:
            pass

        from services.toolchain_resolver import get_toolchain_diagnostics
        toolchains = get_toolchain_diagnostics()

        return jsonify({
            "status": "healthy" if db_healthy else "degraded",
            "database": "connected" if db_healthy else "disconnected",
            "cache": cache.get_stats(),
            "queue": get_queue_stats(),
            "compiler_workers": compiler_pool.get_metrics(),
            "toolchains": toolchains,
            "server_time_utc": format_utc_iso(get_utc_now())
        }), 200 if db_healthy else 503

    @app.route("/api/execution/health")
    def execution_health_check():
        from services.compiler import get_compiler_provider
        from services.toolchain_resolver import get_toolchain_diagnostics
        provider = get_compiler_provider()
        toolchains = get_toolchain_diagnostics()
        
        java_info = toolchains.get("java", {})
        java_available = bool(java_info.get("available"))
        python_available = bool(toolchains.get("python", {}).get("available"))
        
        available_langs = [lang for lang, info in toolchains.items() if info.get("available")]
        is_healthy = java_available and python_available

        status_code = 200 if is_healthy else 503
        return jsonify({
            "success": is_healthy,
            "status": "healthy" if is_healthy else "unavailable",
            "provider": provider.__class__.__name__,
            "provider_type": "local_sandbox" if "Local" in provider.__class__.__name__ else "remote",
            "available_languages": available_langs,
            "java": {
                "available": java_available,
                "javac": java_info.get("javac_path") or "Not found",
                "java": java_info.get("java_path") or "Not found",
                "version": java_info.get("javac_version") or "Unknown"
            },
            "toolchains": toolchains
        }), status_code


    # Error Handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found", "success": False}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error. Please check server logs.", "success": False}), 500

    # Automatic Gzip Compression for JSON & Text Responses (>1KB)
    import gzip
    @app.after_request
    def compress_response(response):
        accept_encoding = request.headers.get("Accept-Encoding", "")
        if (
            "gzip" in accept_encoding.lower()
            and response.status_code < 300
            and not response.direct_passthrough
            and response.mimetype in ["application/json", "text/html", "text/css", "text/plain", "application/javascript"]
        ):
            data = response.get_data()
            if len(data) > 1024:
                compressed_data = gzip.compress(data, compresslevel=6)
                response.set_data(compressed_data)
                response.headers["Content-Encoding"] = "gzip"
                response.headers["Content-Length"] = len(compressed_data)
        return response

    return app

app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print(f"Starting College Coding Platform API server on port {port}...")
    from services.toolchain_resolver import resolve_java_toolchain
    javac, java = resolve_java_toolchain()
    print(f"Java Toolchain: javac={javac}, java={java}")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG, use_reloader=False)
