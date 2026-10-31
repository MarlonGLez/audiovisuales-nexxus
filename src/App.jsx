
import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [modal, setModal] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activePage, setActivePage] = useState('home')
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [audiovisuals, setAudiovisuals] = useState([])
  const [audiovisualsLoading, setAudiovisualsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const filteredAudiovisuals = audiovisuals.filter((item) => {
  const matchesSearch = item.title
    .toLowerCase()
    .includes(searchTerm.toLowerCase())

  const matchesCategory =
    selectedCategory === 'all' ||
    item.category_id === selectedCategory

  return matchesSearch && matchesCategory
})
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    password: '',
  })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null)
    })
   useEffect(() => {
  async function loadAudiovisuals() {
    setAudiovisualsLoading(true)

    const { data, error } = await supabase
      .from('audiovisuals')
      .select(`
        id,
        title,
        description,
        cover_url,
        release_year,
        quality_notes,
        file_size_gb,
        is_featured,
        category_id,
        categories (
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('title', { ascending: true })

    if (error) {
      console.error('Error al cargar audiovisuales:', error)
      setAudiovisuals([])
    } else {
      setAudiovisuals(data || [])
    }

    setAudiovisualsLoading(false)
  }

  loadAudiovisuals()
  }, [])

  useEffect(() => {
  async function loadCategories() {
    setCategoriesLoading(true)
    setCategoriesError('')

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, billing_unit, billing_unit_label, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error al cargar categorías:', error)
      setCategoriesError('No se pudieron cargar las categorías.')
      setCategories([])
    } else {
      setCategories(data || [])
    }

    setCategoriesLoading(false)
  }

  loadCategories()
}, [])

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null)
        if (!session) {
          setProfile(null)
          setActivePage('home')
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser) {
        setProfile(null)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, phone, client_code, created_at')
        .eq('id', currentUser.id)
        .single()

      if (error) {
        console.error('Error al cargar perfil:', error)
        setMessage('No se pudieron cargar los datos de tu cuenta.')
        return
      }

      setProfile(data)
    }

    loadProfile()
  }, [currentUser])

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

      setModal('')
      setActivePage('home')
      setMessage(
        modal === 'register'
          ? '¡Tu cuenta NEXXUS se creó correctamente!'
          : '¡Bienvenido nuevamente a NEXXUS!'
      )
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'Ha ocurrido un error.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 8) {
      setPasswordMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Las contraseñas no coinciden.')
      return
    }

    setPasswordLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordMessage('¡Contraseña actualizada correctamente!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error(error)
      setPasswordMessage(error.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage('No se pudo cerrar la sesión.')
      return
    }

    setCurrentUser(null)
    setProfile(null)
    setActivePage('home')
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

  const sectionStyle = {
    maxWidth: '650px',
    margin: '35px auto',
    padding: '25px',
    background: '#10243b',
    border: '1px solid #24517b',
    borderRadius: '16px',
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span>N</span> NEXXUS
        </div>

        {currentUser ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="login-btn"
              onClick={() => {
                setActivePage('account')
                setMessage('')
              }}
            >
              Mi cuenta
            </button>

            <button className="login-btn" onClick={handleLogout}>
              Salir
            </button>
          </div>
        ) : (
          <button className="login-btn" onClick={() => openModal('login')}>
            Iniciar sesión
          </button>
        )}
      </header>

      <main>
        {activePage === 'home' ? (
          <>
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
                <button
                  className="explore-btn"
                  style={{ marginTop: '15px' }}
                  onClick={() => setActivePage('account')}
                >
                  Entrar a Mi cuenta
                </button>
              </section>
            )}

            {message && (
              <p style={{ textAlign: 'center', color: '#58c7ff', padding: '15px' }}>
                {message}
              </p>
            )}

            <section className="catalog" id="catalogo">
  <h2>Explora nuestro catálogo</h2>
  <p>Encuentra lo que estás buscando.</p>

  <input
    type="search"
    placeholder="Buscar películas, series, juegos..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    style={{
      width: '100%',
      maxWidth: '500px',
      padding: '14px',
      margin: '20px auto',
      display: 'block',
      borderRadius: '10px',
      border: '1px solid #294563',
      background: '#0b1c30',
      color: 'white',
      boxSizing: 'border-box',
    }}
  />

  <div className="categories">
    <div
      className="category"
      onClick={() => setSelectedCategory('all')}
      style={{
        cursor: 'pointer',
        border: selectedCategory === 'all'
          ? '2px solid #58c7ff'
          : undefined,
      }}
    >
      <span>✦</span>
      <h3>Todo</h3>
    </div>

    {categories.map((category) => (
      <div
        className="category"
        key={category.id}
        onClick={() => setSelectedCategory(category.id)}
        style={{
          cursor: 'pointer',
          border: selectedCategory === category.id
            ? '2px solid #58c7ff'
            : undefined,
        }}
      >
        <span>✦</span>
        <h3>{category.name}</h3>
      </div>
    ))}
  </div>

  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '20px',
    marginTop: '30px',
  }}>
    {audiovisualsLoading ? (
      <p>Cargando catálogo...</p>
    ) : filteredAudiovisuals.length === 0 ? (
      <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
        {audiovisuals.length === 0
          ? 'Próximamente añadiremos contenido a nuestro catálogo.'
          : 'No encontramos resultados para tu búsqueda.'}
      </p>
    ) : (
      filteredAudiovisuals.map((item) => (
        <article
          key={item.id}
          style={{
            background: '#10243b',
            border: '1px solid #24517b',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt={item.title}
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: '2 / 3',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              aspectRatio: '2 / 3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b1c30',
              color: '#58c7ff',
              fontSize: '35px',
            }}>
              ✦
            </div>
          )}

          <div style={{ padding: '12px' }}>
            {item.is_featured && (
              <p style={{ color: '#58c7ff', fontSize: '12px' }}>
                ★ DESTACADO
              </p>
            )}

            <h3>{item.title}</h3>

            <p style={{ color: '#a9bdd3', fontSize: '13px' }}>
              {item.categories?.name || ''}
              {item.release_year ? ` · ${item.release_year}` : ''}
            </p>

            {item.quality_notes && (
              <p style={{ color: '#a9bdd3', fontSize: '12px' }}>
                {item.quality_notes}
              </p>
            )}
          </div>
        </article>
      ))
    )}
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
          </>
        ) : (
          <section style={sectionStyle}>
            <button
              className="login-btn"
              onClick={() => setActivePage('home')}
            >
              ← Volver a la tienda
            </button>

            <h1 style={{ textAlign: 'center', margin: '25px 0', color: '#58c7ff' }}>
              Mi cuenta NEXXUS
            </h1>

            {!profile ? (
              <p style={{ textAlign: 'center' }}>
                Cargando los datos de tu cuenta...
              </p>
            ) : (
              <>
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#0b1c30',
                  borderRadius: '12px',
                  marginBottom: '25px',
                }}>
                  <p style={{ color: '#a9bdd3' }}>Tu código de cliente</p>
                  <h2 style={{ color: '#58c7ff', marginTop: '8px' }}>
                    {profile.client_code || 'Pendiente'}
                  </h2>
                </div>

                <h2 style={{ marginBottom: '20px' }}>Datos personales</h2>

                <label>Nombre y apellidos</label>
                <input
                  style={inputStyle}
                  value={profile.display_name || ''}
                  disabled
                />

                <label>Nombre de usuario</label>
                <input
                  style={inputStyle}
                  value={profile.username || ''}
                  disabled
                />

                <label>Teléfono registrado</label>
                <input
                  style={inputStyle}
                  value={profile.phone || ''}
                  disabled
                />

                <label>Fecha de registro</label>
                <input
                  style={inputStyle}
                  value={
                    profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : ''
                  }
                  disabled
                />

                <div style={{
                  borderTop: '1px solid #294563',
                  marginTop: '25px',
                  paddingTop: '25px',
                }}>
                  <h2 style={{ marginBottom: '10px' }}>Seguridad</h2>
                  <p style={{ color: '#a9bdd3', marginBottom: '18px' }}>
                    Cambia tu contraseña de acceso.
                  </p>

                  <form onSubmit={handlePasswordChange}>
                    <label>Nueva contraseña</label>
                    <input
                      style={inputStyle}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                    />

                    <label>Confirmar nueva contraseña</label>
                    <input
                      style={inputStyle}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      minLength={8}
                      required
                    />

                    <button
                      className="explore-btn"
                      type="submit"
                      disabled={passwordLoading}
                      style={{ width: '100%' }}
                    >
                      {passwordLoading
                        ? 'Actualizando...'
                        : 'Cambiar contraseña'}
                    </button>
                  </form>

                  {passwordMessage && (
                    <p style={{
                      color: passwordMessage.includes('correctamente')
                        ? '#58d68d'
                        : '#ff8585',
                      marginTop: '15px',
                      textAlign: 'center',
                    }}>
                      {passwordMessage}
                    </p>
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid #294563',
                  marginTop: '25px',
                  paddingTop: '25px',
                  textAlign: 'center',
                }}>
                  <h2>Mis pedidos</h2>
                  <p style={{ color: '#a9bdd3', marginTop: '10px' }}>
                    Próximamente podrás consultar aquí tu historial de pedidos.
                  </p>
                </div>
              </>
            )}
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
