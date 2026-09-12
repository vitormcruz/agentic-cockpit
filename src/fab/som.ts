const SOM_DURACAO_SEGUNDOS = 0.14
const FREQUENCIA_INICIAL_HZ = 660
const FREQUENCIA_FINAL_HZ = 440
const GANHO_PICO = 0.06

export function tocarSomAberturaCard() {
  try {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const startTime = audioContext.currentTime
    const endTime = startTime + SOM_DURACAO_SEGUNDOS

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(FREQUENCIA_INICIAL_HZ, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(FREQUENCIA_FINAL_HZ, endTime)

    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.exponentialRampToValueAtTime(GANHO_PICO, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.addEventListener(
      'ended',
      () => {
        void audioContext.close().catch((error: unknown) => {
          console.warn('Não foi possível fechar o contexto de áudio.', error)
        })
      },
      { once: true },
    )
    oscillator.start(startTime)
    oscillator.stop(endTime)

    void audioContext.resume().catch((error: unknown) => {
      console.warn('Não foi possível iniciar o som do card flutuante.', error)
    })
  } catch (error: unknown) {
    console.warn('Não foi possível criar o som do card flutuante.', error)
  }
}
