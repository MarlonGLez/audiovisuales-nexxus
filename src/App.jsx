
import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [modal, setModal] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    password: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    })
  }

  function openModal(type) {
    setMessage('')
    setForm({
      fullName: '',
      username: '',
      phone: '',
      password: '',
    })
    setModal(type)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (modal === 'register') {
        const { data: registerData, error: registerError } =
          await supabase.functions.invoke('nexxus-register', {
            body: {
              fullName: form.fullName,
              username: form.username,
              phone: form.phone,
              password: form.password,
            },
          })

        if (registerError) throw registerError
        if (!registerData?.success) {
          throw new Error(registerData?.error || 'No se pudo crear la cuenta')
        }
      }

      const { data: loginData, error: loginError } =
        await supabase.functions.invoke('nexxus-login', {
          body: {
            phone: form.phone,
            password: form.password,
          },
        })

      if (loginError) throw loginError

      if (!loginData?.access_token || !loginData?.refresh_token) {
        throw new Error(loginData?.error || 'No se pudo iniciar sesión')
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token,
      })

      if (sessionError) throw sessionError

      setMessage(
        modal === 'register'
          ? '¡Tu cuenta NEXXUS se creó correctamente!'
          : '¡Bienvenido nuevamente a NEXXUS!'
      )

      setModal('')
    } catch (error) {
      console.error(error)
      setMessage(
        error.message || 'Ha ocurrido un error. Inténtalo nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setMessage('Has cerrado sesión correctamente.')
  }

  const inputStyle = {
    width: '100%',
    padding: '13px',
    marginTop: '7px',
    marginBottom: '14px',
    borderRadius: '9px',
    border: '1px solid #294563',
    background: '#0b1c30',
    color: 'white',
    boxSizing: 'border-box',
    fontSize: '15px',
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span>N</span> NEXXUS
        </div>

        {currentUser ? (
          <button className="login-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        ) : (
          <button className="login-btn" onClick={() => openModal('login')}>
            Iniciar sesión
          </button>
        )}
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">BIENVENIDO A TU TIENDA DIGITAL</p>

          <h1>
            AUDIOVISUALES <span>NEXXUS</span>
          </h1>

          <p className="subtitle">
            Tu entretenimiento, tecnología y contenido favorito
            en un solo lugar.
          </p>

          <button
            className="explore-btn"
            onClick={() =>
              document.getElementById('catalogo')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
          >
            Explorar catálogo
          </button>
        </section>

        {currentUser && (
          <section style={{ textAlign: 'center', padding: '20px' }}>
            <h2>¡Bienvenido a NEXXUS!</h2>
            <p>Ya has iniciado sesión.</p>
          </section>
        )}

        {message && (
          <p style={{ textAlign: 'center', color: '#58c7ff' }}>
            {message}
          </p>
        )}

        <section className="catalog" id="catalogo">
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
              'Miniseries',
            ].map((category) => (
              <div className="category" key={category}>
                <span>✦</span>
                <h3>{category}</h3>
              </div>
            ))}
          </div>
        </section>

        {!currentUser && (
          <section style={{ textAlign: 'center', padding: '35px 15px' }}>
            <h2>Forma parte de NEXXUS</h2>
            <p>Regístrate y comienza a realizar tus pedidos.</p>
            <button
              className="explore-btn"
              onClick={() => openModal('register')}
            >
              Crear mi cuenta
            </button>
          </section>
        )}
      </main>

      <footer>
        © 2026 AUDIOVISUALES NEXXUS
        <p>Tu tienda audiovisual de confianza.</p>
      </footer>

      {modal && (
        <div
          onClick={() => !loading && setModal('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '25px',
              borderRadius: '18px',
              background: '#10243b',
              border: '1px solid #24517b',
              boxSizing: 'border-box',
              color: 'white',
            }}
          >
            <h2 style={{ color: '#58c7ff', textAlign: 'center' }}>
              {modal === 'register' ? 'Crear cuenta NEXXUS' : 'Iniciar sesión'}
            </h2>

            <form onSubmit={handleSubmit}>
              {modal === 'register' && (
                <>
                  <label>Nombre y apellidos</label>
                  <input
                    style={inputStyle}
                    name="fullName"
                    value={form.fullName}
                    onChange={updateField}
                    placeholder="Tu nombre completo"
                    required
                  />

                  <label>Nombre de usuario</label>
                  <input
                    style={inputStyle}
                    name="username"
                    value={form.username}
                    onChange={updateField}
                    placeholder="Ejemplo: usuario123"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </>
              )}

              <label>Teléfono internacional</label>
              <input
                style={inputStyle}
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                placeholder="+5353446213"
                required
              />

              <label>Contraseña</label>
              <input
                style={inputStyle}
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />

              <button
                type="submit"
                className="explore-btn"
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading
                  ? 'Procesando...'
                  : modal === 'register'
                    ? 'Registrarme'
                    : 'Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              {modal === 'register'
                ? '¿Ya tienes cuenta?'
                : '¿Todavía no tienes cuenta?'}
            </p>

            <button
              onClick={() => openModal(
                modal === 'register' ? 'login' : 'register'
              )}
              style={{
                display: 'block',
                margin: 'auto',
                border: 'none',
                background: 'transparent',
                color: '#58c7ff',
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              {modal === 'register'
                ? 'Iniciar sesión'
                : 'Crear una cuenta'}
            </button>

            <button
              onClick={() => setModal('')}
              disabled={loading}
              style={{
                display: 'block',
                margin: '20px auto 0',
                border: 'none',
                background: 'transparent',
                color: '#aabbd0',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
