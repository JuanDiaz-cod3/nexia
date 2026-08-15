import { Button } from './components/Button'
import { Card } from './components/Card'
import { Input } from './components/Input'
import './App.css'

function App() {
  return (
    <main className="page">
      <h1>Nexia</h1>
      <p>Design system en construcción.</p>

      <div className="preview-row">
        <Button variant="primary">Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="primary" disabled>
          Deshabilitado
        </Button>
      </div>

      <Card className="preview-card">
        <h2>Proyecto de ejemplo</h2>
        <Input label="Título del proyecto" placeholder="Ej. Reciclaje escolar" />
        <Input label="Categoría" placeholder="Ej. Ciencias ambientales" />
        <Button variant="primary">Guardar</Button>
      </Card>
    </main>
  )
}

export default App
