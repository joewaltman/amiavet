// Server component form that renders a pet's fields. Both /pets/new and
// /pets/[id] reuse it. The submit action is passed in from the parent.
import type { Pet } from "@prisma/client";

export function PetForm({
  action,
  pet,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => void;
  pet?: Pet | null;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={pet?.name ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="species">Species</label>
          <select
            id="species"
            name="species"
            defaultValue={pet?.species ?? "dog"}
            className="input"
          >
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="breed">Breed</label>
          <input
            id="breed"
            name="breed"
            defaultValue={pet?.breed ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="sex">Sex</label>
          <select
            id="sex"
            name="sex"
            defaultValue={pet?.sex ?? ""}
            className="input"
          >
            <option value="">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="neutered">Neutered/Spayed</label>
          <select
            id="neutered"
            name="neutered"
            defaultValue={
              pet?.neutered == null ? "" : pet.neutered ? "yes" : "no"
            }
            className="input"
          >
            <option value="">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="weightKg">Weight (kg)</label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            defaultValue={pet?.weightKg ?? ""}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="birthDate">Birth date</label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={
            pet?.birthDate ? pet.birthDate.toISOString().slice(0, 10) : ""
          }
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="conditions">Chronic conditions</label>
        <textarea
          id="conditions"
          name="conditions"
          defaultValue={pet?.conditions ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="medications">Medications</label>
        <textarea
          id="medications"
          name="medications"
          defaultValue={pet?.medications ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="allergies">Allergies</label>
        <textarea
          id="allergies"
          name="allergies"
          defaultValue={pet?.allergies ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes for the vet</label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={pet?.notes ?? ""}
          className="input"
        />
      </div>

      <div className="flex justify-end">
        <button className="btn" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
