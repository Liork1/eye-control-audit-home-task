export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Audit Log Viewer</h1>
      <p className="mt-2 text-gray-600">
        Open with query params:{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
          ?tenant_id=tenant-a&amp;user_id=user-1
        </code>
      </p>
    </main>
  );
}
