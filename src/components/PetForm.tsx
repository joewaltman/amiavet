// Shared pet create/edit form. Works with createPetAction / updatePetAction.
import type { Pet } from "@prisma/client";

export function PetForm({
  action,
  pet,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  pet?: Pet;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card space-y-4">
      {pet && <input type="hidden" name="id" value={pet.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name *
          </label>
          <input id="name" name="name" required className="field" defaultValue={pet?.name} placeholder="Bella" />
        </div>
        <div>
          <label className="label" htmlFor="species">
            Species *
          </label>
          <input id="species" name="species" required className="field" defaultValue={pet?.species} placeholder="Dog" />
        </div>
        <div>
          <label className="label" htmlFor="breed">
            Breed
          </label>
          <input id="breed" name="breed" className="field" defaultValue={pet?.breed ?? ""} placeholder="Labrador" />
        </div>
        <div>
          <label className="label" htmlFor="sex">
            Sex
          </label>
          <input id="sex" name="sex" className="field" defaultValue={pet?.sex ?? ""} placeholder="Female (spayed)" />
        </div>
        <div>
          <label className="label" htmlFor="birthdateOrAge">
            Age or birthdate
          </label>
          <input
            id="birthdateOrAge"
            name="birthdateOrAge"
            className="field"
            defaultValue={pet?.birthdateOrAge ?? ""}
            placeholder="4 years"
          />
        </div>
        <div>
          <label className="label" htmlFor="weightLbs">
            Weight (lbs)
          </label>
          <input
            id="weightLbs"
            name="weightLbs"
            type="number"
            step="0.1"
            min="0"
            className="field"
            defaultValue={pet?.weightLbs ?? ""}
            placeholder="65"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notes (chronic conditions, medications, anything relevant)
        </label>
        <textarea id="notes" name="notes" rows={3} className="field resize-y" defaultValue={pet?.notes ?? ""} />
      </div>
      <button type="submit" className="btn">
        {submitLabel}
      </button>
    </form>
  );
}
