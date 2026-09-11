export function PainelSvg() {
  return (
    <section className="content-panel visual-panel" aria-label="SVG inline">
      <svg
        className="inline-svg"
        viewBox="0 0 640 360"
        role="img"
        aria-labelledby="svg-title svg-description"
      >
        <title id="svg-title">Mapa de painéis do lab</title>
        <desc id="svg-description">
          Um painel principal conectado a três renderers de conteúdo.
        </desc>
        <rect width="640" height="360" rx="24" fill="#0d1526" />
        <rect x="48" y="48" width="544" height="264" rx="16" fill="#17243c" />
        <rect x="80" y="82" width="230" height="196" rx="12" fill="#28518c" />
        <rect x="336" y="82" width="224" height="52" rx="10" fill="#263b62" />
        <rect x="336" y="154" width="104" height="124" rx="10" fill="#397d78" />
        <rect x="456" y="154" width="104" height="124" rx="10" fill="#8a5b3c" />
        <circle cx="195" cy="180" r="48" fill="#91b7ff" opacity="0.9" />
        <path d="m174 180 14 14 30-34" fill="none" stroke="#17243c" strokeWidth="10" />
        <path d="M364 108h168" stroke="#91b7ff" strokeLinecap="round" strokeWidth="8" />
        <path d="M364 180h48M484 180h48" stroke="#d8e4ff" strokeLinecap="round" strokeWidth="8" />
        <path d="M364 204h48M484 204h48" stroke="#d8e4ff" strokeLinecap="round" strokeWidth="8" opacity="0.55" />
      </svg>
      <p className="visual-caption">SVG inline, escalável dentro do painel.</p>
    </section>
  )
}
