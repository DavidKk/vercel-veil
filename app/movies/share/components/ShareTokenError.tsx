interface ShareTokenErrorProps {
  error?: string
}

export default function ShareTokenError({ error }: ShareTokenErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">401 Unauthorized</h1>
        <p className="mt-2 text-gray-300">{error === 'Token expired' ? 'This share link has expired (valid for 1 day)' : 'Invalid or expired share link'}</p>
        <p className="mt-4 text-sm text-gray-400">Please request a new share link from the owner.</p>
      </div>
    </div>
  )
}
