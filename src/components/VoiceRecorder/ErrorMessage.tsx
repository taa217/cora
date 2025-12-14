interface ErrorMessageProps {
  message: string
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="rounded-2xl border border-brand-coral/40 bg-brand-coral/15 p-4">
      <p className="text-sm text-brand-coral/90">{message}</p>
    </div>
  )
}

export default ErrorMessage


