import { createFileRoute } from "@tanstack/react-router";
import TutorialBussola from "@/components/tutorial/TutorialBussola";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Treinamento de Bússola — TacticalGIS" },
      {
        name: "description",
        content:
          "Curso interativo passo a passo para aprender a usar a bússola: partes, declinação, marcações, rumos, contra-rumo e quiz de verificação.",
      },
      { property: "og:title", content: "Treinamento de Bússola — TacticalGIS" },
      {
        property: "og:description",
        content: "Aprenda navegação de campo com exercícios usando o sensor real do aparelho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialBussola,
});
