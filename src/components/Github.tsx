import { Github } from "lucide-react"

export function GithubLink({ repo }: { repo: string }) {
  return (
    <a
      href={repo}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-background shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      aria-label="View source on GitHub"
    >
      <Github className="h-5 w-5" />
    </a>
  )
}
