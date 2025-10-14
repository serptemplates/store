import type { FieldErrors, UseFormRegister } from "react-hook-form"

import type { CheckoutFormData } from "./types"

interface CustomerInformationSectionProps {
  register: UseFormRegister<CheckoutFormData>
  errors: FieldErrors<CheckoutFormData>
}

export function CustomerInformationSection({ register, errors }: CustomerInformationSectionProps) {
  return (
    <div>
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Customer Information</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="john@example.com"
          />
          {errors.email ? <p className="text-red-500 text-xs mt-1">{errors.email.message}</p> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("firstName")}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="John"
            />
            {errors.firstName ? <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p> : null}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("lastName")}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Doe"
            />
            {errors.lastName ? <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p> : null}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Country
          </label>
          <select
            {...register("country")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="US">United States (US)</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="JP">Japan</option>
            <option value="BR">Brazil</option>
          </select>
        </div>
      </div>
    </div>
  )
}
