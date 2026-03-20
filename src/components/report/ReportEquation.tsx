import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ReportEquationProps {
  label: string;
  reference?: string;
  equation: string;
  substitution: string;
  result: string;
}

const katexOptions = {
  throwOnError: false,
  displayMode: false,
  trust: true,
} as const;

function renderTex(tex: string): string {
  return katex.renderToString(tex, katexOptions);
}

/**
 * "Show your work" equation component in Breyer-style format.
 *
 * Renders three lines:
 *  1. Equation  -- formula with variable names
 *  2. Values    -- same formula with numbers substituted
 *  3. Result    -- bold final answer
 *
 * All LaTeX is developer-provided (not user input), so dangerouslySetInnerHTML
 * is safe here — no XSS risk from trusted static strings.
 */
export function ReportEquation({
  label,
  reference,
  equation,
  substitution,
  result,
}: ReportEquationProps) {
  return (
    <div className="mb-4">
      {/* Label row */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-bold text-sm">{label}</span>
        {reference && (
          <span className="text-xs text-muted-foreground">({reference})</span>
        )}
      </div>

      {/* Derivation block */}
      <div className="border-l-4 border-blue-200 pl-4 py-2 space-y-1">
        {/* Equation row */}
        <div className="flex items-baseline gap-3">
          <span className="w-16 text-right text-xs text-muted-foreground font-mono">
            Equation:
          </span>
          <span dangerouslySetInnerHTML={{ __html: renderTex(equation) }} />
        </div>

        {/* Values row */}
        <div className="flex items-baseline gap-3">
          <span className="w-16 text-right text-xs text-muted-foreground font-mono">
            Values:
          </span>
          <span dangerouslySetInnerHTML={{ __html: renderTex(substitution) }} />
        </div>

        {/* Result row */}
        <div className="flex items-baseline gap-3">
          <span className="w-16 text-right text-xs text-muted-foreground font-mono">
            Result:
          </span>
          <span
            dangerouslySetInnerHTML={{
              __html: renderTex(`\\boldsymbol{${result}}`),
            }}
          />
        </div>
      </div>
    </div>
  );
}
