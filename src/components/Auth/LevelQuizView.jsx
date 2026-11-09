import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { dismissLevel } from '../../utils/onboarding'
import { CATEGORY_BRANCHES, categoryLabel } from '../../utils/category'
import { LEVEL_QUESTIONS, scoreLevelQuiz, bandForScore, categoryNumberForScore } from '../../utils/levelQuiz'
import CategoryPicker from '../shared/CategoryPicker'
import Btn from '../shared/Btn'

const CARD = 'bg-surface border border-border rounded-2xl p-6 sm:p-8'
const OPTION = 'w-full text-left bg-base border border-border-mid rounded-lg px-4 py-3 cursor-pointer transition-colors hover:border-brand/60 hover:text-white'

// Cuestionario de nivel. Pasos: rama → ¿ya sabés tu categoría? → (elegirla
// directo | 6 preguntas) → resultado ajustable → guardar en el perfil.
// Se ofrece al registrarse y desde la portada mientras el perfil no tenga categoría.
export default function LevelQuizView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, login } = useAuth()
  const next = (params.get('next') ?? '').startsWith('/') ? params.get('next') : '/'

  const [branch,   setBranch]   = useState(null)
  const [step,     setStep]     = useState('branch')   // branch | known | direct | q | result
  const [qIndex,   setQIndex]   = useState(0)
  const [answers,  setAnswers]  = useState({})
  const [category, setCategory] = useState(null)
  const [result,   setResult]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  function answer(question, value) {
    const updated = { ...answers, [question.id]: value }
    setAnswers(updated)
    if (qIndex < LEVEL_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1)
      return
    }
    const r = scoreLevelQuiz(updated)
    setResult(r)
    setCategory(`${branch}${categoryNumberForScore(r.score)}`)
    setStep('result')
  }

  function back() {
    setError(null)
    if (step === 'q' && qIndex > 0) return setQIndex(qIndex - 1)
    if (step === 'q' || step === 'direct') return setStep('known')
    if (step === 'result') { setQIndex(LEVEL_QUESTIONS.length - 1); return setStep('q') }
    if (step === 'known') return setStep('branch')
  }

  function skip() {
    dismissLevel()
    navigate(next)
  }

  async function save() {
    if (!category) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.auth.updateMe({
        category,
        level_score: step === 'result' ? result.score : null,
      })
      login({ ...user, category: updated.category, level_score: updated.level_score })
      navigate(next)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const question = LEVEL_QUESTIONS[qIndex]
  const band = result ? bandForScore(result.score) : null

  return (
    <div className="max-w-[520px] mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-4 min-h-[32px]">
        {step !== 'branch' ? (
          <button type="button" onClick={back} className="inline-flex items-center gap-1.5 bg-transparent border-0 text-muted hover:text-white cursor-pointer font-sans text-[13px] p-0">
            <ArrowLeft size={15} /> Volver
          </button>
        ) : <span />}
        <button type="button" onClick={skip} className="bg-transparent border-0 text-dim hover:text-white cursor-pointer font-sans text-[12px] p-0">
          Completar después
        </button>
      </div>

      <div className={CARD}>
        <div className="font-mono text-[10px] tracking-widest text-brand mb-2">TU NIVEL</div>

        {step === 'branch' && (
          <>
            <h1 className="font-condensed font-bold text-[24px] text-white m-0 mb-1.5">¿En qué rama jugás?</h1>
            <p className="text-soft font-sans text-[13px] m-0 mb-5">Tu categoría la ven los organizadores cuando te inscribís a un torneo.</p>
            <div className="flex flex-col gap-2.5">
              {CATEGORY_BRANCHES.map((b) => (
                <button key={b.value} type="button" className={OPTION} onClick={() => { setBranch(b.value); setStep('known') }}>
                  <span className="font-sans text-[14px] text-content">{b.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'known' && (
          <>
            <h1 className="font-condensed font-bold text-[24px] text-white m-0 mb-1.5">¿Ya sabés tu categoría?</h1>
            <p className="text-soft font-sans text-[13px] m-0 mb-5">Si no la sabés, respondé 6 preguntas y te recomendamos una.</p>
            <div className="flex flex-col gap-2.5">
              <button type="button" className={OPTION} onClick={() => { setCategory(null); setStep('direct') }}>
                <span className="font-sans text-[14px] text-content">Sí, la elijo</span>
              </button>
              <button type="button" className={OPTION} onClick={() => { setQIndex(0); setStep('q') }}>
                <span className="font-sans text-[14px] text-content">No, ayudame a calcularla</span>
              </button>
            </div>
          </>
        )}

        {step === 'direct' && (
          <>
            <h1 className="font-condensed font-bold text-[24px] text-white m-0 mb-5">Elegí tu categoría</h1>
            <CategoryPicker value={category} onChange={setCategory} defaultBranch={branch ?? 'C'} emptyLabel="Elegí el número" />
          </>
        )}

        {step === 'q' && question && (
          <>
            <div className="font-mono text-[11px] text-dim mb-1">Pregunta {qIndex + 1} de {LEVEL_QUESTIONS.length}</div>
            <div className="h-1 bg-border rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: `${((qIndex + 1) / LEVEL_QUESTIONS.length) * 100}%` }} />
            </div>
            <h1 className="font-condensed font-bold text-[22px] text-white m-0 mb-4">{question.title}</h1>
            <div className="flex flex-col gap-2.5">
              {question.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={`${OPTION} ${answers[question.id] === o.value ? 'border-brand' : ''}`}
                  onClick={() => answer(question, o.value)}
                >
                  <span className="block font-sans text-[14px] text-content">{o.label}</span>
                  {o.text && <span className="block font-sans text-[12px] text-muted mt-0.5">{o.text}</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'result' && result && band && (
          <>
            <h1 className="font-condensed font-bold text-[24px] text-white m-0 mb-1">Tu nivel: {band.label}</h1>
            <p className="text-soft font-sans text-[13px] m-0 mb-4">
              Puntaje {result.score.toFixed(1)} de 8.0. Te recomendamos <strong className="text-white">{categoryLabel(category)}</strong>.
            </p>
            {result.score !== result.self && (
              <p className="text-muted font-sans text-[12px] m-0 mb-4">
                Ajustamos tu nivel con tu experiencia: lo que respondiste sobre tiempo de juego, frecuencia, clases y torneos pesa más que la autopercepción.
              </p>
            )}
            <div className="font-mono text-[10px] tracking-widest text-[#555] mb-1.5">¿QUERÉS AJUSTARLA?</div>
            <CategoryPicker value={category} onChange={setCategory} emptyLabel="Elegí el número" />
          </>
        )}

        {(step === 'direct' || step === 'result') && (
          <>
            {error && <p className="text-danger font-sans text-[12px] mt-4 mb-0">{error}</p>}
            <Btn variant="primary" icon={Check} full onClick={save} loading={saving} disabled={!categoryLabel(category)} className="mt-5">
              GUARDAR EN MI PERFIL
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}
