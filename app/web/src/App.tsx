import { lazy, Suspense, useEffect, useState } from 'react'
import { Center, Loader } from '@mantine/core'
import CoverPage from './cover/CoverPage'
import DeskPage from './desk/DeskPage'

// The library, the evaluation and the fine print are downloaded only when opened.
const LibraryPage = lazy(() => import('./library/LibraryPage'))
const QualityPage = lazy(() => import('./library/QualityPage'))
const AboutPage = lazy(() => import('./cover/AboutPage'))

export type Page = 'cover' | 'desk' | 'library' | 'quality' | 'about'

/** Tiny hash router: '#/' the cover, '#/ask' the desk, '#/library', '#/quality', '#/about'. */
function useHashRoute(): Page {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const head = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  if (head === 'ask') return 'desk'
  if (head === 'library' || head === 'quality' || head === 'about') return head
  return 'cover'
}

export default function App() {
  const page = useHashRoute()

  useEffect(() => {
    if (page !== 'desk') window.scrollTo(0, 0)
  }, [page])

  const fallback = (
    <Center h="60vh">
      <Loader color="ink" type="bars" />
    </Center>
  )

  return (
    <>
      {page === 'cover' && <CoverPage />}
      {/* The desk stays mounted while another page is open, so a reader who looks something up
          in the library comes back to the same answer and history. */}
      <div className={page === 'desk' ? undefined : 'cn-parked'}>
        <DeskPage active={page === 'desk'} />
      </div>
      {page === 'library' && <Suspense fallback={fallback}><LibraryPage /></Suspense>}
      {page === 'quality' && <Suspense fallback={fallback}><QualityPage /></Suspense>}
      {page === 'about' && <Suspense fallback={fallback}><AboutPage /></Suspense>}
    </>
  )
}
