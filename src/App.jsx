
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

  // Administración
  const [coverFile, setCoverFile] = useState(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbType, setTmdbType] = useState('multi')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [tmdbDetailsLoading, setTmdbDetailsLoading] = useState(false)
  const [tmdbMessage, setTmdbMessage] = useState('')
  const [selectedTmdb, setSelectedTmdb] = useState(null)
  const [newItem, setNewItem] = useState({
    title: '',
    category_id: '',
    description: '',
    release_year: '',
    quality_notes: '',
    file_size_gb: '',
    is_featured: false,
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

  const isAdmin = currentUser?.app_metadata?.role === 'superadmin'

  // Inicialización segura de sesión
  useEffect(() => {
    let mounted = true
    let authEventReceived = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      authEventReceived = true

      console.log('Evento de autenticación:', event)
      console.log('Sesión disponible:', !!session)

      setCurrentUser(session?.user ?? null)

      if (!session) {
        setProfile(null)
        setActivePage('home')
      }
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || authEventReceived) return

      if (error) {
        console.error('Error recuperando sesión:', error)
        return
      }

      setCurrentUser(data.session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Cargar categorías
  useEffect(() => {
    async function loadCategories() {
      setCategoriesLoading(true)
      setCategoriesError('')

      const { data, error } = await supabase
        .from('categories')
        .select(
          'id, name, slug, description, billing_unit, billing_unit_label, sort_order'
        )
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

  // Cargar audiovisuales
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

  useEffect(() => {
    loadAudiovisuals()
  }, [])

  // Cargar perfil
  useEffect(() => {
    let cancelled = false

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

      if (cancelled) return

      if (error) {
        console.error('Error al cargar perfil:', error)
        setMessage('No se pudieron cargar los datos de tu cuenta.')
        return
      }

      setProfile(data)
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [currentUser])

  // Filtrar catálogo
  const filteredAudiovisuals = audiovisuals.filter((item) => {
    const matchesSearch = (item.title || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' ||
      item.category_id === selectedCategory

    return matchesSearch && matchesCategory
  })

  function updateField(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
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

  // Registro e inicio de sesión
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
          throw new Error(
            registerData?.error || 'No se pudo crear la cuenta'
          )
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
        throw new Error(
          loginData?.error || 'No se pudo iniciar sesión'
        )
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: loginData.access_token,
          refresh_token: loginData.refresh_token,
        })

      if (sessionError) throw sessionError

      if (!sessionData.session) {
        throw new Error('Supabase no pudo establecer la sesión.')
      }

      setCurrentUser(sessionData.session.user)
      setProfile(null)
      setModal('')
      setActivePage('home')

      setMessage(
        modal === 'register'
          ? '¡Tu cuenta NEXXUS se creó correctamente!'
          : '¡Bienvenido nuevamente a NEXXUS!'
      )
    } catch (error) {
      console.error('Error de autenticación:', error)
      setMessage(error.message || 'Ha ocurrido un error.')
    } finally {
      setLoading(false)
    }
  }

  // Cambiar contraseña
  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 8) {
      setPasswordMessage(
        'La contraseña debe tener al menos 8 caracteres.'
      )
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

      setPasswordMessage(
        '¡Contraseña actualizada correctamente!'
      )

      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error(error)
      setPasswordMessage(
        error.message || 'No se pudo cambiar la contraseña.'
      )
    } finally {
      setPasswordLoading(false)
    }
  }
    // Buscar películas y series en TMDB
  async function searchTmdb(event) {
    event.preventDefault()
    setTmdbLoading(true)
    setTmdbMessage('')
    setTmdbResults([])
    setSelectedTmdb(null)

    try {
      if (!isAdmin) {
        throw new Error('No tienes permisos de administrador.')
      }

      const { data, error } = await supabase.functions.invoke(
        'nexxus-search-media',
        {
          body: {
            action: 'search',
            query: tmdbQuery.trim(),
            type: tmdbType,
            language: 'es-ES',
          },
        }
      )

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setTmdbResults(data?.results || [])

      if (!data?.results?.length) {
        setTmdbMessage('No encontramos resultados.')
      }
    } catch (error) {
      console.error('Error buscando en TMDB:', error)
      setTmdbMessage(error.message || 'Error al buscar.')
    } finally {
      setTmdbLoading(false)
    }
  }

  // Obtener detalles completos de un resultado
  async function selectTmdbResult(result) {
    setTmdbDetailsLoading(true)
    setTmdbMessage('Consultando información completa...')
    setSelectedTmdb(null)

    try {
      const type = result.media_type

      if (!['movie', 'tv'].includes(type)) {
        throw new Error('Tipo de contenido no compatible.')
      }

      const { data, error } = await supabase.functions.invoke(
        'nexxus-search-media',
        {
          body: {
            action: 'details',
            id: result.id,
            type,
            language: 'es-ES',
          },
        }
      )

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const posterUrl = data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : ''

      const year = data.release_date
        ? data.release_date.substring(0, 4)
        : ''

      setSelectedTmdb(data)

      setNewItem((previous) => ({
        ...previous,
        title: data.title || '',
        description: data.overview || '',
        release_year: year,
      }))

      setTmdbMessage('Información cargada. Revisa los datos antes de guardar.')
    } catch (error) {
      console.error('Error obteniendo detalles:', error)
      setTmdbMessage(error.message || 'No se pudieron obtener los detalles.')
    } finally {
      setTmdbDetailsLoading(false)
    }
  }
  // Añadir audiovisual
  async function handleCreateAudiovisual(event) {
    event.preventDefault()
    setAdminSaving(true)
    setAdminMessage('')

    let uploadedPath = null

    try {
      if (!isAdmin) {
        throw new Error('No tienes permisos de administrador.')
      }

      if (!newItem.title.trim() || !newItem.category_id) {
        throw new Error(
          'Debes indicar el título y la categoría.'
        )
      }

      let coverUrl = null

      if (coverFile) {
        if (!coverFile.type.startsWith('image/')) {
          throw new Error(
            'El archivo seleccionado no es una imagen.'
          )
        }

        if (coverFile.size > 5 * 1024 * 1024) {
          throw new Error(
            'La portada no puede superar los 5 MB.'
          )
        }

        const extension = coverFile.name
          .split('.')
          .pop()
          .toLowerCase()

        const fileName = `${crypto.randomUUID()}.${extension}`

        uploadedPath = `portadas/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(uploadedPath, coverFile, {
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('covers')
          .getPublicUrl(uploadedPath)

        coverUrl = publicUrlData.publicUrl
      }

      const { error: insertError } = await supabase
        .from('audiovisuals')
        .insert({
          title: newItem.title.trim(),
          category_id: newItem.category_id,
          description: newItem.description.trim() || null,
          cover_url: coverUrl,
          release_year: newItem.release_year
            ? Number(newItem.release_year)
            : null,
          quality_notes: newItem.quality_notes.trim() || null,
          file_size_gb: newItem.file_size_gb
            ? Number(newItem.file_size_gb)
            : null,
          is_featured: newItem.is_featured,
          is_active: true,
          created_by: currentUser.id,
        })

      if (insertError) throw insertError

      setAdminMessage(
        '¡Contenido añadido correctamente!'
      )

      setNewItem({
        title: '',
        category_id: '',
        description: '',
        release_year: '',
        quality_notes: '',
        file_size_gb: '',
        is_featured: false,
      })

      setCoverFile(null)

      const fileInput = document.getElementById('admin-cover')

      if (fileInput) fileInput.value = ''

      await loadAudiovisuals()
    } catch (error) {
      console.error('Error al guardar contenido:', error)

      if (uploadedPath) {
        const { error: removeError } = await supabase.storage
          .from('covers')
          .remove([uploadedPath])

        if (removeError) {
          console.error(
            'No se pudo eliminar la portada temporal:',
            removeError
          )
        }
      }

      setAdminMessage(
        error.message || 'No se pudo guardar el contenido.'
      )
    } finally {
      setAdminSaving(false)
    }
  }

  // Cerrar sesión
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
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            {isAdmin && (
              <button
                className="login-btn"
                onClick={() => {
                  setActivePage('admin')
                  setAdminMessage('')
                }}
              >
                Administración
              </button>
            )}

            <button
              className="login-btn"
              onClick={() => {
                setActivePage('account')
                setMessage('')
              }}
            >
              Mi cuenta
            </button>

            <button
              className="login-btn"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            className="login-btn"
            onClick={() => openModal('login')}
          >
            Iniciar sesión
          </button>
        )}
      </header>

      <main>
        {activePage === 'home' ? (
          <>
            <section className="hero">
              <p className="eyebrow">
                BIENVENIDO A TU TIENDA DIGITAL
              </p>

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
              <section
                style={{
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
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
              <p
                style={{
                  textAlign: 'center',
                  color: '#58c7ff',
                  padding: '15px',
                }}
              >
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

              {categoriesLoading ? (
                <p>Cargando categorías...</p>
              ) : categoriesError ? (
                <p>{categoriesError}</p>
              ) : (
                <div className="categories">
                  <div
                    className="category"
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      cursor: 'pointer',
                      border:
                        selectedCategory === 'all'
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
                      onClick={() =>
                        setSelectedCategory(category.id)
                      }
                      style={{
                        cursor: 'pointer',
                        border:
                          selectedCategory === category.id
                            ? '2px solid #58c7ff'
                            : undefined,
                      }}
                    >
                      <span>✦</span>
                      <h3>{category.name}</h3>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '20px',
                  marginTop: '30px',
                }}
              >
                {audiovisualsLoading ? (
                  <p>Cargando catálogo...</p>
                ) : filteredAudiovisuals.length === 0 ? (
                  <p
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                    }}
                  >
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
                        <div
                          style={{
                            aspectRatio: '2 / 3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#0b1c30',
                            color: '#58c7ff',
                            fontSize: '35px',
                          }}
                        >
                          ✦
                        </div>
                      )}

                      <div style={{ padding: '12px' }}>
                        {item.is_featured && (
                          <p
                            style={{
                              color: '#58c7ff',
                              fontSize: '12px',
                            }}
                          >
                            ★ DESTACADO
                          </p>
                        )}

                        <h3>{item.title}</h3>

                        <p
                          style={{
                            color: '#a9bdd3',
                            fontSize: '13px',
                          }}
                        >
                          {item.categories?.name || ''}
                          {item.release_year
                            ? ` · ${item.release_year}`
                            : ''}
                        </p>

                        {item.quality_notes && (
                          <p
                            style={{
                              color: '#a9bdd3',
                              fontSize: '12px',
                            }}
                          >
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
              <section
                style={{
                  textAlign: 'center',
                  padding: '35px 15px',
                }}
              >
                <h2>Forma parte de NEXXUS</h2>
                <p>
                  Regístrate y comienza a realizar tus pedidos.
                </p>

                <button
                  className="explore-btn"
                  onClick={() => openModal('register')}
                >
                  Crear mi cuenta
                </button>
              </section>
            )}
          </>
        ) : activePage === 'admin' ? (
          <section style={sectionStyle}>
            <button
              className="login-btn"
              onClick={() => setActivePage('home')}
            >
              ← Volver a la tienda
            </button>

            <h1
              style={{
                color: '#58c7ff',
                textAlign: 'center',
                margin: '25px 0',
              }}
            >
              Panel de administración
            </h1>

            {!isAdmin ? (
              <p>No tienes autorización para acceder.</p>
            ) : (
              <>
                <h2 style={{ marginBottom: '20px' }}>
                  Añadir nuevo contenido
                </h2>

                <form onSubmit={handleCreateAudiovisual}>
                  <label>Nombre del contenido</label>

                  <input
                    style={inputStyle}
                    value={newItem.title}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        title: e.target.value,
                      })
                    }
                    placeholder="Ejemplo: Avatar"
                    required
                  />

                  <label>Categoría</label>

                  <select
                    style={inputStyle}
                    value={newItem.category_id}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        category_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Seleccionar categoría
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <label>Descripción</label>

                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: '90px',
                    }}
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción del contenido"
                  />

                  <label>Portada</label>

                  <input
                    id="admin-cover"
                    style={inputStyle}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      setCoverFile(e.target.files?.[0] || null)
                    }
                  />

                  {coverFile && (
                    <p
                      style={{
                        color: '#58c7ff',
                        marginBottom: '15px',
                      }}
                    >
                      Imagen seleccionada: {coverFile.name}
                    </p>
                  )}

                  <label>Año de lanzamiento</label>

                  <input
                    style={inputStyle}
                    type="number"
                    min="1900"
                    max="2100"
                    value={newItem.release_year}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        release_year: e.target.value,
                      })
                    }
                    placeholder="2026"
                  />

                  <label>Calidad</label>

                  <input
                    style={inputStyle}
                    value={newItem.quality_notes}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quality_notes: e.target.value,
                      })
                    }
                    placeholder="HD, Full HD, 4K..."
                  />

                  <label>Tamaño en GB</label>

                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.file_size_gb}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        file_size_gb: e.target.value,
                      })
                    }
                    placeholder="Ejemplo: 2.5"
                  />

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '15px 0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newItem.is_featured}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          is_featured: e.target.checked,
                        })
                      }
                    />
                    Marcar como contenido destacado
                  </label>

                  <button
                    type="submit"
                    className="explore-btn"
                    disabled={adminSaving}
                    style={{ width: '100%' }}
                  >
                    {adminSaving
                      ? 'Guardando contenido...'
                      : 'Guardar contenido'}
                  </button>
                </form>

                {adminMessage && (
                  <p
                    style={{
                      marginTop: '20px',
                      textAlign: 'center',
                      color: adminMessage.includes('correctamente')
                        ? '#58d68d'
                        : '#ff8585',
                    }}
                  >
                    {adminMessage}
                  </p>
                )}
              </>
            )}
          </section>
        ) : (
          <section style={sectionStyle}>
            <button
              className="login-btn"
              onClick={() => setActivePage('home')}
            >
              ← Volver a la tienda
            </button>

            <h1
              style={{
                textAlign: 'center',
                margin: '25px 0',
                color: '#58c7ff',
              }}
            >
              Mi cuenta NEXXUS
            </h1>

            {!profile ? (
              <p style={{ textAlign: 'center' }}>
                Cargando los datos de tu cuenta...
              </p>
            ) : (
              <>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    background: '#0b1c30',
                    borderRadius: '12px',
                    marginBottom: '25px',
                  }}
                >
                  <p style={{ color: '#a9bdd3' }}>
                    Tu código de cliente
                  </p>

                  <h2
                    style={{
                      color: '#58c7ff',
                      marginTop: '8px',
                    }}
                  >
                    {profile.client_code || 'Pendiente'}
                  </h2>
                </div>

                <h2 style={{ marginBottom: '20px' }}>
                  Datos personales
                </h2>

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
                      ? new Date(
                          profile.created_at
                        ).toLocaleDateString()
                      : ''
                  }
                  disabled
                />

                <div
                  style={{
                    borderTop: '1px solid #294563',
                    marginTop: '25px',
                    paddingTop: '25px',
                  }}
                >
                  <h2 style={{ marginBottom: '10px' }}>
                    Seguridad
                  </h2>

                  <p
                    style={{
                      color: '#a9bdd3',
                      marginBottom: '18px',
                    }}
                  >
                    Cambia tu contraseña de acceso.
                  </p>

                  <form onSubmit={handlePasswordChange}>
                    <label>Nueva contraseña</label>

                    <input
                      style={inputStyle}
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                    />

                    <label>Confirmar nueva contraseña</label>

                    <input
                      style={inputStyle}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
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
                    <p
                      style={{
                        color: passwordMessage.includes(
                          'correctamente'
                        )
                          ? '#58d68d'
                          : '#ff8585',
                        marginTop: '15px',
                        textAlign: 'center',
                      }}
                    >
                      {passwordMessage}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    borderTop: '1px solid #294563',
                    marginTop: '25px',
                    paddingTop: '25px',
                    textAlign: 'center',
                  }}
                >
                  <h2>Mis pedidos</h2>

                  <p
                    style={{
                      color: '#a9bdd3',
                      marginTop: '10px',
                    }}
                  >
                    Próximamente podrás consultar aquí tu
                    historial de pedidos.
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
            <h2
              style={{
                color: '#58c7ff',
                textAlign: 'center',
              }}
            >
              {modal === 'register'
                ? 'Crear cuenta NEXXUS'
                : 'Iniciar sesión'}
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
                style={{
                  width: '100%',
                  marginTop: '10px',
                }}
              >
                {loading
                  ? 'Procesando...'
                  : modal === 'register'
                    ? 'Registrarme'
                    : 'Entrar'}
              </button>
            </form>

            <p
              style={{
                textAlign: 'center',
                marginTop: '20px',
              }}
            >
              {modal === 'register'
                ? '¿Ya tienes cuenta?'
                : '¿Todavía no tienes cuenta?'}
            </p>

            <button
              onClick={() =>
                openModal(
                  modal === 'register' ? 'login' : 'register'
                )
              }
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
