// Garde-fous de la marque blanche : le thème est complet et aucune couleur de la marque n'est revenue en dur.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DOSSIER_CSS = join(__dirname, '../../../frontend/css')
const lire = (nom) => readFileSync(join(DOSSIER_CSS, nom), 'utf8')
const theme = lire('theme.css')
const variablesDefinies = new Set([...theme.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
const fichiersCss = ['style.css', 'admin.css', 'login.css']

describe('thème (marque blanche)', () => {
  it('chaque variable utilisée par le CSS est définie dans theme.css', () => {
    for (const nom of fichiersCss) {
      for (const [, variable] of lire(nom).matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        expect(variablesDefinies, `${nom} utilise ${variable}`).toContain(variable)
      }
    }
  })

  it("aucune couleur de la marque n'est écrite en dur hors de theme.css", () => {
    const couleursMarque = [...theme.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase())
    for (const nom of fichiersCss) {
      const contenu = lire(nom).toLowerCase()
      for (const couleur of couleursMarque) {
        expect(contenu.includes(couleur), `${couleur} en dur dans ${nom}`).toBe(false)
      }
    }
  })

  it('les composants Vue n’écrivent pas le nom de la marque en dur', () => {
    const fichiers = (dossier) =>
      readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? e.name === '__tests__'
            ? []
            : fichiers(join(dossier, e.name))
          : [join(dossier, e.name)],
      )
    for (const fichier of fichiers(join(__dirname, '..')).filter((f) => f.endsWith('.vue'))) {
      expect(readFileSync(fichier, 'utf8'), fichier).not.toContain('Oh My Brunch')
    }
  })
})
