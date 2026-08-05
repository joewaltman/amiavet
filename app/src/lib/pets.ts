// Server-side pet parsing/validation from FormData.
import { z } from "zod";

const PetInput = z.object({
  name: z.string().min(1).max(60),
  species: z.enum(["dog", "cat", "other"]).default("dog"),
  breed: z.string().max(120).optional().nullable(),
  sex: z.enum(["", "male", "female"]).optional(),
  neutered: z.enum(["", "yes", "no"]).optional(),
  weightKg: z.string().optional(),
  birthDate: z.string().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
});

export function parsePetForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  const parsed = PetInput.parse(raw);
  return {
    name: parsed.name,
    species: parsed.species,
    breed: nullify(parsed.breed),
    sex: parsed.sex ? parsed.sex : null,
    neutered:
      parsed.neutered === "yes" ? true : parsed.neutered === "no" ? false : null,
    weightKg: parsed.weightKg ? Number(parsed.weightKg) : null,
    birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
    conditions: nullify(parsed.conditions),
    medications: nullify(parsed.medications),
    allergies: nullify(parsed.allergies),
    notes: nullify(parsed.notes),
  };
}

function nullify(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}
