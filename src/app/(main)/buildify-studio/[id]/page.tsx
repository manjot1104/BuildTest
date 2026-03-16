import { BuildifyStudioEditor } from '@/components/buildify-studio/editor'

export const metadata = {
  title: 'Edit Design',
}

export default async function EditDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BuildifyStudioEditor designId={id} />
}
