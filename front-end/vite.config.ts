import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This creates the @/ alias that shadcn/ui uses in its imports
      "@": path.resolve(__dirname, "./src"),
    },
  },
})