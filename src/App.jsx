
import React from 'react'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span>N</span> NEXXUS
        </div>
        <button className="login-btn">Iniciar sesión</button>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">BIENVENIDO A TU TIENDA DIGITAL</p>
          <h1>AUDIOVISUALES <span>NEXXUS</span></h1>
          <p className="subtitle">
            Tu entretenimiento, tecnología y contenido favorito
            en un solo lugar.
          </p>
          <button className="explore-btn">
            Explorar catálogo
          </button>
        </section>

        <section className="catalog">
          <h2>Explora nuestro catálogo</h2>
          <p>Encuentra lo que estás buscando.</p>

          <div className="categories">
            {[
              'Películas',
              'Animados',
              'Series animadas',
              'Anime',
              'Documentales',
              'Juegos',
              'Doramas',
              'Series',
              'Reality',
              'Miniseries'
            ].map((category) => (
              <div className="category" key={category}>
                <span>✦</span>
                <h3>{category}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        © 2026 AUDIOVISUALES NEXXUS
        <p>Tu tienda audiovisual de confianza.</p>
      </footer>
    </div>
  )
}
