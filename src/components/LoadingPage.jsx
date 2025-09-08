import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/LoadingPage.css"

function LoadingPage() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Make animation visible immediately
    setVisible(true)

    // Preload App component
    const preloadApp = async () => {
      try {
        await import('../App')
      } catch (error) {
        console.error('Error preloading App:', error)
      }
    }
    preloadApp()

    // Navigate to dashboard after 3 seconds
    const timer = setTimeout(() => {
      // Use memory router navigation
      navigate("/dashboard", { replace: true })
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="loading-container">
      <div className="loading-content">
        <h1 className={`envison-text ${visible ? "visible" : ""}`}>ENVISION</h1>

        <div className="dots-container">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`dot ${visible ? "animate" : ""}`}
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoadingPage
