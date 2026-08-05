"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startAsk } from "@/lib/actions";

interface PetOption {
  id: string;
  name: string;
  species: string;
}

function SubmitButton({ loggedIn }: { loggedIn: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn w-full sm:w-auto" disabled={pending}>
      {pending ? "Thinking…" : loggedIn ? "Ask Amia" : "Ask Amia — free"}
    </button>
  );
}

export function AskBox({ pets, loggedIn }: { pets: PetOption[]; loggedIn: boolean }) {
  const hasPets = pets.length > 0;
  const [petId, setPetId] = useState<string>(hasPets ? pets[0].id : "__new__");
  const showNewPet = petId === "__new__";

  return (
    <form action={startAsk} className="card space-y-4">
      <div>
        <label className="label" htmlFor="question">
          What&apos;s going on with your pet?
        </label>
        <textarea
          id="question"
          name="question"
          required
          minLength={5}
          rows={4}
          className="field resize-y"
          placeholder="e.g. My 4-year-old lab has been limping on her back left leg since this morning and licking at the paw…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="petId">
            Who is this about?
          </label>
          <select
            id="petId"
            name="petId"
            className="field"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species})
              </option>
            ))}
            <option value="__new__">+ Add a new pet</option>
          </select>
        </div>

        {showNewPet && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="newPetName">
                Pet name
              </label>
              <input id="newPetName" name="newPetName" className="field" placeholder="Bella" />
            </div>
            <div>
              <label className="label" htmlFor="newPetSpecies">
                Species
              </label>
              <input id="newPetSpecies" name="newPetSpecies" className="field" placeholder="Dog" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {loggedIn
            ? "Free AI answer. A licensed vet is one click away."
            : "You'll create a free account to see your answer. We'll keep your question."}
        </p>
        <SubmitButton loggedIn={loggedIn} />
      </div>
    </form>
  );
}
