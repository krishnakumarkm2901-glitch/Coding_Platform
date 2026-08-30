import os
from flask import Flask, jsonify
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

        return jsonify({
            "status": "healthy" if db_healthy else "degraded",
            "database": "connected" if db_healthy else "disconnected",
            "cache": cache.get_stats(),
            "queue": get_queue_stats(),
            "compiler_workers": compiler_pool.get_metrics(),
            "server_time_utc": format_utc_iso(get_utc_now())
        }), 200 if db_healthy else 503

    # Error Handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found", "success": False}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error. Please check server logs.", "success": False}), 500

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "success": False}), 400

    return app

app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print(f"Starting College Coding Platform API server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
