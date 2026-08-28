// Ficha completa de un paciente: historial de citas, tests, consentimientos, notas
export default function FichaPacientePage({ params }: { params: { id: string } }) {
  // requiereProfesional(sesion) antes de renderizar
  return <div>Ficha del paciente {params.id}</div>;
}
