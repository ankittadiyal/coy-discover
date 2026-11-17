import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5001'
const SWIPE_THRESHOLD = 100

async function readApiResponse(response) {
  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok || data?.success !== true) {
    throw new Error(data?.message || `Request failed with status ${response.status}.`)
  }

  return data
}

function formatMatchedDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function App() {
  const [activeTab, setActiveTab] = useState('Discover')
  const [feedback, setFeedback] = useState('')
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [swipeError, setSwipeError] = useState('')
  const [isSwiping, setIsSwiping] = useState(false)
  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesError, setMatchesError] = useState('')
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const swipePointerRef = useRef(null)
  const swipeLockRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfiles() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetch(`${API_URL}/feed`, {
          signal: controller.signal,
        })
        const data = await readApiResponse(response)

        if (!Array.isArray(data.profiles)) {
          throw new Error('The server returned an invalid profile list.')
        }

        const safeProfiles = data.profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          age: profile.age,
          photo: profile.photo,
          bio: profile.bio,
          location: profile.location,
          interests: profile.interests,
        }))

        setProfiles(safeProfiles)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(`Unable to load profiles. ${error.message}`)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProfiles()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (activeTab !== 'Matches') return undefined

    const controller = new AbortController()

    async function loadMatches() {
      setMatchesLoading(true)
      setMatchesError('')

      try {
        const response = await fetch(`${API_URL}/matches`, {
          signal: controller.signal,
        })
        const data = await readApiResponse(response)

        if (!Array.isArray(data.matches)) {
          throw new Error('The server returned an invalid matches list.')
        }

        setMatches(
          data.matches.map((match) => ({
            id: match.id,
            name: match.name,
            age: match.age,
            photo: match.photo,
            bio: match.bio,
            location: match.location,
            interests: match.interests,
            matchedAt: match.matchedAt,
          })),
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMatchesError(`Unable to load matches. ${error.message}`)
        }
      } finally {
        if (!controller.signal.aborted) {
          setMatchesLoading(false)
        }
      }
    }

    loadMatches()

    return () => controller.abort()
  }, [activeTab])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setFeedback('')
    setSwipeError('')
  }

  async function handleSwipe(action) {
    const currentProfile = profiles[0]
    if (!currentProfile || isSwiping || swipeLockRef.current) return

    swipeLockRef.current = true
    setIsSwiping(true)
    setSwipeError('')
    setFeedback('')

    try {
      const response = await fetch(`${API_URL}/swipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: currentProfile.id,
          action,
        }),
      })
      const data = await readApiResponse(response)

      if (data.success !== true) {
        throw new Error(data.message || 'The swipe could not be saved.')
      }

      setProfiles((currentProfiles) =>
        currentProfiles.filter((profile) => profile.id !== currentProfile.id),
      )

      if (data.isMatch === true) {
        const matchedName = data.match?.name || currentProfile.name
        setFeedback(`It's a match! You and ${matchedName} liked each other.`)
      } else {
        setFeedback(
          action === 'like'
            ? `You liked ${currentProfile.name}.`
            : `You passed on ${currentProfile.name}.`,
        )
      }
    } catch (error) {
      setSwipeError(`Unable to save your swipe. ${error.message}`)
    } finally {
      swipeLockRef.current = false
      setIsSwiping(false)
      setIsDragging(false)
      setDragX(0)
    }
  }

  function handleCardPointerDown(event) {
    if (
      isSwiping ||
      swipeLockRef.current ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    swipePointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleCardPointerMove(event) {
    const pointer = swipePointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return

    const offsetX = event.clientX - pointer.startX
    const offsetY = event.clientY - pointer.startY

    if (Math.abs(offsetY) > Math.abs(offsetX) && Math.abs(offsetY) > 8) {
      swipePointerRef.current = null
      setIsDragging(false)
      setDragX(0)
      return
    }

    setIsDragging(Math.abs(offsetX) > 8)
    setDragX(offsetX)
  }

  function handleCardPointerUp(event) {
    const pointer = swipePointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return

    const offsetX = event.clientX - pointer.startX
    swipePointerRef.current = null
    setIsDragging(false)

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      setDragX(offsetX)
      handleSwipe(offsetX > 0 ? 'like' : 'pass')
    } else {
      setDragX(0)
    }
  }

  function handleCardPointerCancel(event) {
    if (swipePointerRef.current?.pointerId !== event.pointerId) return

    swipePointerRef.current = null
    setIsDragging(false)
    setDragX(0)
  }

  function renderTabContent() {
    if (activeTab === 'Home') {
      return (
        <section className="home-placeholder">
          <h2>Welcome to Coy Discover</h2>
          <p>Find someone new to connect with.</p>
        </section>
      )
    }

    if (activeTab === 'Matches') {
      if (matchesLoading) {
        return (
          <section className="matches-content">
            <p className="profile-feedback" role="status">
              Loading matches...
            </p>
          </section>
        )
      }

      if (matchesError) {
        return (
          <section className="matches-content">
            <p className="profile-feedback" role="alert">
              {matchesError}
            </p>
          </section>
        )
      }

      if (matches.length === 0) {
        return (
          <section className="matches-empty-state">
            <h2>No matches yet</h2>
            <p>Your mutual matches will appear here.</p>
          </section>
        )
      }

      return (
        <section className="matches-content">
          <h2 className="matches-content__title">Your matches</h2>
          <div className="matches-grid">
            {matches.map((match) => (
              <article className="profile-card profile-card--match" key={match.id}>
                <img
                  className="profile-card__photo"
                  src={match.photo}
                  alt={`Portrait of ${match.name}`}
                />
                <div className="profile-card__details">
                  <h3 className="profile-card__name">
                    {match.name}, {match.age}
                  </h3>
                  <p className="profile-card__location">{match.location}</p>
                  <p className="profile-card__bio">{match.bio}</p>
                  <ul className="profile-card__interests">
                    {(match.interests || []).map((interest) => (
                      <li className="profile-card__interest" key={interest}>
                        {interest}
                      </li>
                    ))}
                  </ul>
                  {match.matchedAt && (
                    <p className="profile-card__matched-at">
                      Matched {formatMatchedDate(match.matchedAt)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (isLoading) {
      return (
        <section className="discover-content">
          <p className="profile-feedback" role="status">
            Loading profiles...
          </p>
        </section>
      )
    }

    if (loadError) {
      return (
        <section className="discover-content">
          <p className="profile-feedback" role="alert">
            {loadError}
          </p>
        </section>
      )
    }

    const currentProfile = profiles[0]

    if (!currentProfile) {
      return (
        <section className="matches-empty-state">
          <h2>You're all caught up</h2>
          <p>There are no more profiles to discover right now.</p>
          {feedback && (
            <p className="profile-feedback" role="status">
              {feedback}
            </p>
          )}
        </section>
      )
    }

    return (
      <section className="discover-content">
        <article
          className={`profile-card profile-card--swipeable${isDragging ? ' profile-card--dragging' : ''}`}
          key={currentProfile.id}
          onPointerDown={handleCardPointerDown}
          onPointerMove={handleCardPointerMove}
          onPointerUp={handleCardPointerUp}
          onPointerCancel={handleCardPointerCancel}
          style={{
            transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX * 0.035}deg)`,
          }}
        >
          <span
            className={`profile-card__swipe-indicator profile-card__swipe-indicator--like${dragX > 8 ? ' profile-card__swipe-indicator--visible' : ''}`}
            aria-hidden="true"
          >
            LIKE
          </span>
          <span
            className={`profile-card__swipe-indicator profile-card__swipe-indicator--pass${dragX < -8 ? ' profile-card__swipe-indicator--visible' : ''}`}
            aria-hidden="true"
          >
            PASS
          </span>
          <img
            className="profile-card__photo"
            src={currentProfile.photo}
            alt={`Portrait of ${currentProfile.name}`}
            draggable="false"
          />
          <div className="profile-card__details">
            <h2 className="profile-card__name">
              {currentProfile.name}, {currentProfile.age}
            </h2>
            <p className="profile-card__location">{currentProfile.location}</p>
            <p className="profile-card__bio">{currentProfile.bio}</p>
            <ul className="profile-card__interests">
              {(currentProfile.interests || []).map((interest) => (
                <li className="profile-card__interest" key={interest}>
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <div className="profile-actions">
          <button
            className="profile-actions__button profile-actions__button--pass"
            type="button"
            disabled={isSwiping}
            onClick={() => handleSwipe('pass')}
          >
            Pass
          </button>
          <button
            className="profile-actions__button profile-actions__button--like"
            type="button"
            disabled={isSwiping}
            onClick={() => handleSwipe('like')}
          >
            Like
          </button>
        </div>
        {isSwiping && (
          <p className="profile-feedback" role="status">
            Saving your choice...
          </p>
        )}
        {swipeError && (
          <p className="profile-feedback" role="alert">
            {swipeError}
          </p>
        )}
        {feedback && !swipeError && (
          <p className="profile-feedback" role="status">
            {feedback}
          </p>
        )}
      </section>
    )
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="app-header__title">Coy Discover</h1>
      </header>

      <nav className="app-navigation" aria-label="Main navigation">
        {['Home', 'Discover', 'Matches'].map((tab) => (
          <button
            className={`app-navigation__tab${activeTab === tab ? ' app-navigation__tab--active' : ''}`}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            key={tab}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {renderTabContent()}
    </main>
  )
}

export default App
