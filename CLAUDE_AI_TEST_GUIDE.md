# 🤖 Guía de Prueba - Claude AI Asistente

## ✅ Estado Actual

```
👤 Usuario: jarosquijano@gmail.com
🟢 Provider: CLAUDE (Claude 3.5 Sonnet)
🔑 API Key: ****-QAA
✅ Status: ACTIVE y listo para usar
💬 Chats: 0 (primera vez)
```

---

## 🎯 Paso 1: Abrir el Asistente AI

### En la Web:

1. Ve a **https://aifinity.app**
2. Login con tu cuenta
3. Ve al tab **Insights** (💡)
4. Busca el **botón flotante azul** con icono de robot (abajo a la derecha)
5. Click para abrir el chat

---

## 🧪 Paso 2: Tests Recomendados

### **Test 1: Saludo Básico**
```
¿Hola, puedes ver mis datos financieros?
```

**Resultado esperado:**
- Claude responde en español
- Menciona tus datos financieros del último mes
- Muestra conocimiento de tus transacciones

---

### **Test 2: Análisis de Gastos**
```
¿En qué categoría gasto más dinero?
```

**Resultado esperado:**
- Claude identifica tus top 5 categorías
- Te dice cuánto has gastado en cada una
- Sugiere posibles áreas de ahorro

---

### **Test 3: Consulta de Budget**
```
¿Cómo voy con mi presupuesto este mes?
```

**Resultado esperado:**
- Claude compara tu gasto actual vs presupuesto
- Te dice si estás sobre/bajo presupuesto
- Sugiere acciones si estás sobrepasado

---

### **Test 4: Análisis de Balance**
```
¿Cuál es mi situación financiera actual?
```

**Resultado esperado:**
- Claude resume tu income vs expenses
- Menciona tu net balance
- Da recomendaciones personalizadas

---

### **Test 5: Proyecciones**
```
Si sigo gastando así, ¿cómo terminaré el mes?
```

**Resultado esperado:**
- Claude proyecta tus gastos basado en el ritmo actual
- Compara con tu income esperado
- Te avisa si terminarás en positivo o negativo

---

## 💡 Contexto Financiero que Claude Ve

Claude tiene acceso a estos datos en tiempo real:

### **Últimos 30 días:**
```javascript
{
  summary: {
    totalIncome: 123.40,      // Octubre con income shifting
    totalExpenses: 6817.18,   // Gastos del mes
    netBalance: -6693.78,     // Balance del mes
    transactionCount: 141     // Número de transacciones
  },
  budgets: [
    { category: "Comida", budget: 500, spent: 234, remaining: 266 },
    // ... más categorías
  ],
  topCategories: [
    { category: "Shopping", total: 2500 },
    { category: "Food & Dining", total: 1200 },
    // ... top 5
  ]
}
```

---

## 🔍 Características del Asistente

### **✅ Lo Que Puede Hacer:**

1. **Análisis Financiero:**
   - Ver tus ingresos y gastos
   - Identificar patrones de gasto
   - Comparar con presupuestos

2. **Recomendaciones:**
   - Sugerir áreas de ahorro
   - Alertar sobre sobregastos
   - Dar consejos personalizados

3. **Proyecciones:**
   - Estimar gastos futuros
   - Predecir tu balance de fin de mes
   - Calcular ahorros potenciales

4. **Contexto Inteligente:**
   - Entiende income shifting
   - Considera tus budgets configurados
   - Analiza tus top categorías

### **❌ Lo Que NO Puede Hacer:**

- No puede modificar datos (solo leer)
- No puede ejecutar transacciones
- No puede acceder a tu cuenta bancaria
- No guarda información sensible (solo el historial de chat)

---

## 🎨 Interfaz del Chat

### **Elementos:**

```
┌─────────────────────────────────────┐
│ 🤖 Asistente Financiero            │
├─────────────────────────────────────┤
│                                     │
│ 👤 Tu pregunta aquí               │
│                                     │
│ 🤖 Respuesta de Claude aquí        │
│    (con formato, emojis, etc)      │
│                                     │
│ 💬 [Escribe tu pregunta...]        │
│                            [Enviar] │
└─────────────────────────────────────┘
```

---

## 📊 Verificar Que Funciona

### **Indicadores de Éxito:**

✅ El botón del chat aparece en Insights  
✅ El chat se abre al hacer click  
✅ Puedes escribir un mensaje  
✅ Claude responde en 2-5 segundos  
✅ La respuesta es relevante a tus datos  
✅ El historial se guarda (puedes cerrar y abrir el chat)  

### **Si Algo Falla:**

#### **Error: "No active AI configuration"**
- Ve a Settings
- Verifica que Claude esté marcado como activo
- Guarda de nuevo la configuración

#### **Error: "Failed to get AI response"**
- Tu API key puede ser inválida
- Verifica en https://console.anthropic.com/
- Genera una nueva key si es necesario
- Actualiza en Settings

#### **Error: "Request failed with status code 401"**
- Logout y login de nuevo
- Verifica que estés autenticado
- Revisa la consola del navegador (F12)

---

## 🧪 Test Avanzado (Opcional)

Si quieres probar la API directamente desde terminal:

### **Comando:**
```bash
node backend/test-claude-api.js YOUR_API_KEY
```

### **Resultado Esperado:**
```
🧪 Testing Claude API Connection...
✅ Claude API is working!
📨 Response from Claude:
¡Hola, estoy funcionando!
💡 Model used: claude-3-5-sonnet-20241022
🔢 Tokens used: { input_tokens: 15, output_tokens: 8 }
```

---

## 📝 Historial de Chat

El historial se guarda automáticamente:

- ✅ Cada pregunta y respuesta se almacena
- ✅ Se carga cuando abres el chat
- ✅ Puedes ver conversaciones anteriores
- ✅ No se comparte entre usuarios (privado)

### **Verificar Historial:**
```bash
node backend/check-ai-config.js
```

---

## 💰 Costos de Claude

### **Claude 3.5 Sonnet Pricing:**

| Tipo | Costo |
|------|-------|
| **Input** | $3 / 1M tokens |
| **Output** | $15 / 1M tokens |

### **Ejemplo de Uso:**

Una conversación típica usa:
- ~100 tokens de entrada (tu pregunta + contexto)
- ~200 tokens de salida (respuesta de Claude)

**Costo por mensaje:**
```
Input:  100 tokens × $3/1M  = $0.0003
Output: 200 tokens × $15/1M = $0.0030
TOTAL:  ≈ $0.0033 por mensaje
```

**Estimación:**
- 100 mensajes ≈ $0.33
- 1,000 mensajes ≈ $3.30

---

## 🎯 Preguntas Sugeridas para el Usuario

Aquí hay ejemplos específicos basados en tus datos:

### **Sobre Income Shifting:**
```
"¿Por qué mi balance de octubre es negativo si recibí mi salario el 28?"
```

### **Sobre Gastos:**
```
"¿Cuánto he gastado en Shopping este mes?"
```

### **Sobre Budget:**
```
"¿En qué categorías estoy sobrepasando mi presupuesto?"
```

### **Proyecciones:**
```
"Si mi salario es de €6,461 al mes, ¿podré cubrir mis gastos?"
```

### **Consejos:**
```
"Dame 3 consejos para ahorrar dinero basado en mis gastos"
```

---

## ✅ Checklist Final

Antes de dar por completada la prueba:

- [ ] Claude API key está configurada y activa
- [ ] El botón del chat aparece en Insights
- [ ] Puedes abrir el chat
- [ ] Claude responde a preguntas básicas
- [ ] Claude menciona tus datos reales
- [ ] Las respuestas son coherentes y útiles
- [ ] El historial se guarda correctamente
- [ ] No hay errores en la consola

---

## 🚀 Next Steps

Una vez que confirmes que funciona:

1. **Úsalo regularmente** para análisis financiero
2. **Pregunta consejos** personalizados
3. **Verifica proyecciones** antes de gastos grandes
4. **Monitorea tus budgets** con ayuda de Claude

---

**¡Listo para probar! 🎉**

Ve a https://aifinity.app > Insights > Click en el botón del chat

