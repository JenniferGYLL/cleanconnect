"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function BookingForm({
  companyId,
  customerId,
}: {
  companyId: string;
  customerId: string | null;
}) {
  const [serviceType, setServiceType] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!customerId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/signup/customer" className="font-medium text-brand-600">
          create a customer account
        </Link>{" "}
        to request a booking.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center text-sm text-brand-700">
        Request sent — track it from{" "}
        <Link href="/my-bookings" className="font-semibold underline">
          My bookings
        </Link>
        .
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("leads").insert({
      company_id: companyId,
      customer_id: customerId,
      service_type: serviceType,
      customer_contact: address,
      message,
      status: "requested",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Service type
        </span>
        <input
          required
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="input"
          placeholder="e.g. Office cleaning, twice weekly"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </span>
        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Message (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input"
          rows={3}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5"
      >
        {loading ? "Sending…" : "Request a booking"}
      </button>
    </form>
  );
}
