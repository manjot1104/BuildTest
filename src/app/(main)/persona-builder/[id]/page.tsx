import { PersonaBuilderEditor } from '@/components/persona-builder/editor'

export const metadata = {
  title: 'Edit Persona – Buildify',
}

export default async function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PersonaBuilderEditor personaId={id} />
}
