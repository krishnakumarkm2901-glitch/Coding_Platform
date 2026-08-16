import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  X, 
  RotateCcw, 
  History as HistoryIcon, 
  Sparkles, 
  Delete, 
  CornerDownLeft, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  Copy,
  Check
} from 'lucide-react';

export const ScientificCalculator = ({ isOpen, onClose }) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [isScientific, setIsScientific] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [isRad, setIsRad] = useState(false); // Degrees vs Radians
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Factorial helper
  const factorial = (n) => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= Math.min(n, 170); i++) res *= i;
    return res;
  };

  // Solve algebraic equation helper (e.g. "2x + 5 = 15" or "x^2 - 5x + 6 = 0")
  const trySolveEquation = (eqStr) => {
    const clean = eqStr.trim();
    if (!clean.includes('=')) return null;

    const parts = clean.split('=');
    if (parts.length !== 2) return null;

    let lhs = parts[0].trim().toLowerCase();
    let rhs = parts[1].trim().toLowerCase();

    // 1. Quadratic Equation: ax^2 + bx + c = 0 or x^2 - 5x + 6 = 0
    // Standardize: move all terms to lhs
    // Check for x^2 or x²
    const isQuad = /x\^?2|x²/i.test(lhs) || /x\^?2|x²/i.test(rhs);
    if (isQuad) {
      try {
        // Simple quadratic regex matcher: a*x^2 + b*x + c = 0
        // e.g. x^2 - 5x + 6 = 0 or x² - 5x + 6 = 0
        const fullExpr = `${lhs}-(${rhs})`.replace(/x²/g, 'x^2');
        // Extract a, b, c
        // Regex for ax^2 + bx + c
        const quadMatch = fullExpr.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x\^2\s*([+-]?\s*\d*\.?\d*)\s*\*?\s*x\s*([+-]?\s*\d+\.?\d*)?/i);
        if (quadMatch) {
          let aStr = (quadMatch[1] || '').replace(/\s+/g, '');
          let bStr = (quadMatch[2] || '').replace(/\s+/g, '');
          let cStr = (quadMatch[3] || '0').replace(/\s+/g, '');

          let a = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
          let b = bStr === '' || bStr === '+' ? 1 : (bStr === '-' ? -1 : parseFloat(bStr));
          let c = parseFloat(cStr || '0');

          if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a !== 0) {
            const disc = b * b - 4 * a * c;
            if (disc > 0) {
              const x1 = (-b + Math.sqrt(disc)) / (2 * a);
              const x2 = (-b - Math.sqrt(disc)) / (2 * a);
              return `x = ${Number(x1.toFixed(4))}, x = ${Number(x2.toFixed(4))}`;
            } else if (disc === 0) {
              const x = -b / (2 * a);
              return `x = ${Number(x.toFixed(4))}`;
            } else {
              const real = (-b / (2 * a)).toFixed(4);
              const imag = (Math.sqrt(-disc) / (2 * a)).toFixed(4);
              return `x = ${real} ± ${imag}i`;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Linear Equation: ax + b = c (e.g. "2x + 5 = 15" -> x = 5)
    try {
      const linMatchLHS = lhs.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x\s*([+-]?\s*\d+\.?\d*)?/i);
      const rhsVal = parseFloat(evalMathExpr(rhs));
      if (linMatchLHS && !isNaN(rhsVal)) {
        let aStr = (linMatchLHS[1] || '').replace(/\s+/g, '');
        let bStr = (linMatchLHS[2] || '0').replace(/\s+/g, '');

        let a = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
        let b = parseFloat(bStr || '0');

        if (!isNaN(a) && !isNaN(b) && a !== 0) {
          const xVal = (rhsVal - b) / a;
          return `x = ${Number(xVal.toFixed(4))}`;
        }
      }
    } catch (err) {
      console.error(err);
    }

    return null;
  };

  // Safe evaluation of mathematical expressions
  const evalMathExpr = (expr) => {
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, `${Math.PI}`)
      .replace(/\be\b/g, `${Math.E}`)
      .replace(/\bmod\b/gi, '%')
      .replace(/\^/g, '**')
      .replace(/√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1)')
      .replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

    // Trigonometric & logarithmic functions
    if (isRad) {
      sanitized = sanitized
        .replace(/\bsin\(([^)]+)\)/g, 'Math.sin($1)')
        .replace(/\bcos\(([^)]+)\)/g, 'Math.cos($1)')
        .replace(/\btan\(([^)]+)\)/g, 'Math.tan($1)');
    } else {
      sanitized = sanitized
        .replace(/\bsin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
        .replace(/\bcos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
        .replace(/\btan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
    }

    sanitized = sanitized
      .replace(/\bln\(([^)]+)\)/g, 'Math.log($1)')
      .replace(/\blog\(([^)]+)\)/g, 'Math.log10($1)')
      .replace(/\babs\(([^)]+)\)/g, 'Math.abs($1)');

    // Evaluate safely
    // eslint-disable-next-line no-new-func
    const evalFunc = new Function(`return (${sanitized});`);
    const val = evalFunc();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return Number(val.toFixed(8)).toString();
    }
    return String(val);
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;

    // Check if it's an algebraic equation
    if (expression.includes('=')) {
      const eqResult = trySolveEquation(expression);
      if (eqResult) {
        setResult(eqResult);
        setHistory(prev => [{ expr: expression, res: eqResult, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 20)]);
        return;
      }
    }

    // Standard expression
    try {
      const evaluated = evalMathExpr(expression);
      setResult(evaluated);
      setHistory(prev => [{ expr: expression, res: evaluated, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 20)]);
    } catch (err) {
      setResult('Error');
    }
  };

  const appendSymbol = (sym) => {
    setExpression(prev => prev + sym);
  };

  const handleClear = () => {
    setExpression('');
    setResult('');
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const handleApplyHistory = (item) => {
    setExpression(item.expr);
    setResult(item.res);
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCalculate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      {/* Container Box */}
      <div 
        className="w-full max-w-lg rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] shadow-2xl overflow-hidden flex flex-col font-sans transition-all text-[#172033] dark:text-[#F8FAFC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#F5F7FA] dark:bg-[#20252C] border-b border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-[#172033] dark:text-[#F8FAFC]">Scientific Calculator</span>
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] font-bold">
                {isRad ? 'RAD' : 'DEG'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScientific(!isScientific)}
              className="px-2.5 py-1 rounded-xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[11px] font-bold text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] transition"
            >
              {isScientific ? 'Basic' : 'Scientific'}
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-xl border transition ${
                showHistory 
                  ? 'bg-[#0757B8] text-white border-[#0757B8]' 
                  : 'bg-[#FFFFFF] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033]'
              }`}
              title="Calculation History"
            >
              <HistoryIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#EF4444] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-[#F8FAFC] dark:bg-[#0B0F14] border-b border-[#D9E0E8] dark:border-[#30363D] space-y-1">
          <input
            ref={inputRef}
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="25 × 4 + 100, √144, 2x + 5 = 15"
            className="w-full text-right font-mono text-base font-semibold bg-transparent border-none outline-none text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 placeholder:text-xs"
          />
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCopyResult}
              disabled={!result}
              className="text-[11px] font-mono text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] flex items-center gap-1 disabled:opacity-30 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <div className="text-right font-mono font-extrabold text-2xl text-[#0757B8] dark:text-[#60A5FA] truncate max-w-xs">
              {result ? `= ${result}` : '0'}
            </div>
          </div>
        </div>

        {/* History Drawer (if open) */}
        {showHistory ? (
          <div className="p-4 max-h-72 overflow-y-auto space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#94A3B8] pb-1 border-b border-[#D9E0E8] dark:border-[#30363D]">
              <span>Calculation History</span>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-[#EF4444] hover:underline"
              >
                Clear History
              </button>
            </div>
            {history.length === 0 ? (
              <div className="py-8 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                No calculations in current session yet.
              </div>
            ) : (
              history.map((h, hIdx) => (
                <div
                  key={hIdx}
                  onClick={() => handleApplyHistory(h)}
                  className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:border-[#0757B8] border border-transparent cursor-pointer transition flex items-center justify-between"
                >
                  <div className="text-left truncate max-w-[240px]">
                    <div className="text-[#667085] dark:text-[#94A3B8] text-[11px]">{h.expr}</div>
                    <div className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">= {h.res}</div>
                  </div>
                  <span className="text-[10px] text-slate-400">{h.time}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Calculator Keypad */
          <div className="p-4 space-y-2 text-xs font-mono font-bold select-none">
            {/* Scientific Function Keys */}
            {isScientific && (
              <div className="grid grid-cols-6 gap-1.5 pb-2 border-b border-[#D9E0E8] dark:border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setIsRad(!isRad)}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0757B8] dark:text-[#60A5FA] text-[11px]"
                >
                  {isRad ? 'RAD' : 'DEG'}
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('sin(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  sin
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('cos(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  cos
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('tan(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  tan
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('log(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  log
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('ln(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  ln
                </button>

                <button
                  type="button"
                  onClick={() => appendSymbol('π')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  π
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('e')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  e
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('^2')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  x²
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('^')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  xʸ
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol('√(')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  √
                </button>
                <button
                  type="button"
                  onClick={() => appendSymbol(' mod ')}
                  className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-[11px]"
                >
                  mod
                </button>
              </div>
            )}

            {/* Standard Keypad Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handleClear}
                className="p-3 rounded-2xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] font-bold"
              >
                AC
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#667085] dark:text-[#94A3B8]"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('(')}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC]"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(')')}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC]"
              >
                )
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' ÷ ')}
                className="p-3 rounded-2xl bg-[#0757B8]/15 dark:bg-[#0066CC]/20 hover:bg-[#0757B8]/25 text-[#0757B8] dark:text-[#60A5FA]"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => appendSymbol('7')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('8')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('9')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' % ')}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC]"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' × ')}
                className="p-3 rounded-2xl bg-[#0757B8]/15 dark:bg-[#0066CC]/20 hover:bg-[#0757B8]/25 text-[#0757B8] dark:text-[#60A5FA]"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => appendSymbol('4')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('5')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('6')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('x')}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400"
                title="Variable x for equations"
              >
                x
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' - ')}
                className="p-3 rounded-2xl bg-[#0757B8]/15 dark:bg-[#0066CC]/20 hover:bg-[#0757B8]/25 text-[#0757B8] dark:text-[#60A5FA]"
              >
                -
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => appendSymbol('1')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('2')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('3')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' = ')}
                className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] hover:bg-slate-200 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400"
                title="Equals sign for equations"
              >
                =
              </button>
              <button
                type="button"
                onClick={() => appendSymbol(' + ')}
                className="p-3 rounded-2xl bg-[#0757B8]/15 dark:bg-[#0066CC]/20 hover:bg-[#0757B8]/25 text-[#0757B8] dark:text-[#60A5FA]"
              >
                +
              </button>

              {/* Row 5 */}
              <button
                type="button"
                onClick={() => appendSymbol('0')}
                className="p-3 col-span-2 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => appendSymbol('.')}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A202C] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]"
              >
                .
              </button>
              <button
                type="button"
                onClick={handleCalculate}
                className="p-3 col-span-2 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-extrabold text-base shadow-md shadow-blue-500/20 flex items-center justify-center"
              >
                <span>=</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div className="px-5 py-2.5 bg-[#F5F7FA] dark:bg-[#20252C] border-t border-[#D9E0E8] dark:border-[#30363D] text-[10px] text-[#667085] dark:text-[#94A3B8] flex items-center justify-between">
          <span>Supports Arithmetic, Trig, Powers & Algebraic Equations</span>
          <span className="font-mono">Press Enter to calculate</span>
        </div>
      </div>
    </div>
  );
};
