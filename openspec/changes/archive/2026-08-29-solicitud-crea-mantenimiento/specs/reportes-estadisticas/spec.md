## ADDED Requirements

### Requirement: Un mantenimiento cancelado no cuenta como falla del equipo

El indicador de equipos con fallas recurrentes MUST NOT contar los
mantenimientos cancelados. Un mantenimiento que no llegó a realizarse no es
evidencia de que el equipo haya fallado.

La paridad entre lo mostrado y lo exportado ya está garantizada por su propio
requisito; este solo fija qué entra en el cálculo.

#### Scenario: Dos correctivos, uno cancelado

- **WHEN** un equipo acumula en el periodo dos mantenimientos correctivos y uno
  de ellos está cancelado
- **THEN** el equipo no figura entre los de fallas recurrentes

#### Scenario: Cancelar saca a un equipo de la lista

- **WHEN** un equipo figura entre los de fallas recurrentes y se cancela uno de
  los mantenimientos que lo llevaron ahí
- **THEN** el equipo deja de figurar en el indicador
