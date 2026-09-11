import labPreviewUrl from '../assets/lab-preview.svg'

export function PainelImagem() {
  return (
    <section className="content-panel visual-panel" aria-label="Imagem local">
      <img
        className="local-image"
        src={labPreviewUrl}
        alt="Ilustração de uma interface com painéis conectados"
      />
      <p className="visual-caption">Imagem local carregada de src/assets.</p>
    </section>
  )
}
