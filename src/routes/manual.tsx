import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/manual")({
  component: ManualLayout,
});

function ManualLayout() {
  return <Outlet />;
}
