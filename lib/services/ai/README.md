# Infraestructura de Inteligencia Artificial y Seguimiento de Costos

Este documento detalla cómo Blukastor realiza el seguimiento del uso y los costos de los modelos de lenguaje (LLM) de forma per-tenant (por empresa).

## 1. Modelo de Datos

La tabla principal para el seguimiento es `llm_invocations`. Cada vez que el sistema realiza una llamada a una IA (ya sea desde la aplicación web o desde n8n), se registra una fila en esta tabla.

### Columnas Clave
- `company_id`: UUID de la empresa (`client_companies`) que originó la solicitud.
- `agent_type`: El propósito de la llamada (ej: `finance`, `goals`, `onboarding`).
- `model_name`: El identificador del modelo (ej: `gemini-2.0-flash`, `gpt-4o-mini`).
- `input_tokens` / `output_tokens`: Cantidad de tokens procesados.
- `estimated_cost_usd`: Costo calculado en base a los tokens y el modelo.
- `latency_ms`: Tiempo de respuesta del modelo.
- `success`: Booleano que indica si la llamada fue exitosa.

## 2. Captura de Datos (Instrumentación)

### En la Aplicación Web (Next.js)
El `OrchestratorService` actúa como el punto central. Los agentes individuales (`FinanceAgent`, `GoalsAgent`, etc.) capturan el `usageMetadata` del SDK de Gemini y lo devuelven al orquestador.

**Flujo de Registro:**
1. El Agente ejecuta `model.generateContent()`.
2. El Agente extrae `promptTokenCount` y `candidatesTokenCount`.
3. El Agente devuelve la respuesta con un objeto oculto `_tokenUsage`.
4. El `OrchestratorService` detecta este objeto y llama a `logLLMInvocation()`.

### En n8n
Los workflows de n8n deben configurarse para insertar en esta misma tabla. 
- Para **OpenAI**: Usar `$json.usage.prompt_tokens` y `$json.usage.completion_tokens`.
- Para **Gemini**: Usar `$json.usageMetadata.promptTokenCount` y `$json.usageMetadata.candidatesTokenCount`.

## 3. Utilidades

### `log-invocation.ts`
Ubicación: `lib/services/ai/log-invocation.ts`

Esta utilidad centraliza la lógica de:
- Inserción en Supabase.
- Cálculo de costo estimado en base a tablas de precios internas (USD por cada 1,000 tokens).
- Manejo de errores (falla de forma silenciosa para no interrumpir la experiencia del usuario).

## 4. Visualización (Admin Dashboard)

Se implementó un dashboard en el panel de Finanzas Administrativas (`/admin/finance`).

### Componentes:
- **API Route**: `app/api/admin/ai-costs-by-company/route.ts`. Agrega los datos de `llm_invocations` por `company_id`.
- **UI Component**: `app/admin/finance/_components/CompanyAICosts.tsx`. Muestra tarjetas de resumen, una tabla detallada por empresa y gráficos de invocaciones diarias.

### Lógica de Estimación de Costos
Si una fila no tiene tokens registrados (datos históricos), la API utiliza un "Costo Promedio de Fallback" por invocación para que el dashboard no aparezca en cero. Una vez que se empiezan a registrar tokens reales, el cálculo se vuelve exacto.

## 5. Mantenimiento de Precios

Para actualizar los costos de los modelos, debe modificarse el objeto `MODEL_PRICING` en:
1. `lib/services/ai/log-invocation.ts` (para registros de la web app).
2. `app/api/admin/ai-costs-by-company/route.ts` (para el dashboard).

## 6. Próximos Pasos Recomendados
1. **Actualizar n8n**: Asegurarse de que todos los nodos de IA en n8n pasen los conteos de tokens a la base de datos.
2. **Monitoreo de Latencia**: Utilizar el campo `avg_latency_ms` en el dashboard para detectar modelos que estén degradando la experiencia del usuario.
