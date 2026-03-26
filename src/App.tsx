import { Suspense } from 'react'
import { Routes, Route, useParams, Navigate } from 'react-router-dom'
import { Layout } from './components/layout'
import { Home } from './pages/Home'
import { Components } from './pages/Components'
import { getToolByPath } from './tools/registry'

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = getToolByPath(`/${toolId}`)

  if (!tool) {
    return <Navigate to="/" replace />
  }

  const ToolComponent = tool.component
  return (
    <Suspense fallback={null}>
      <ToolComponent />
    </Suspense>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/components" element={<Components />} />
        <Route path="/:toolId" element={<ToolPage />} />
      </Routes>
    </Layout>
  )
}
