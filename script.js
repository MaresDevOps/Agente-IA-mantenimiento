  
    const N8N_URL = "https://maresdev.app.n8n.cloud/webhook/chat-mantenimiento"; 

  async function enviarMensaje() {
        const input = document.getElementById('userInput');
        const text = input.value;
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';
        input.focus();

        const loadingId = addMessage("Analizando datos...", 'bot', true);

        try {
            const response = await fetch(N8N_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });


            const rawText = await response.text();
            console.log("Respuesta cruda de n8n:", rawText);

            if (!rawText) {
                throw new Error("El servidor respondió vacío (Revisa que el flujo n8n esté ACTIVO).");
            }

        
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error("No es JSON válido:", rawText);
                throw new Error("El servidor no devolvió un JSON válido.");
            }

            removeMessage(loadingId);

       
            let reporte = {};
            
    
            if (data.output) {
                let cleanJson = typeof data.output === 'string' 
                    ? data.output.replace(/```json/g, "").replace(/```/g, "").trim()
                    : JSON.stringify(data.output);
                
                try {
                    reporte = JSON.parse(cleanJson);
                } catch (e) {
                    reporte = { mensaje: cleanJson }; 
                }
            } 
           
            else if (data.accion || data.mensaje) {
                reporte = data;
            }
         
            else {
                reporte = { mensaje: typeof data === 'string' ? data : JSON.stringify(data) };
            }


            if (reporte.accion === "GUARDAR_UNIDAD" || reporte.accion === "AGENDAR_CITA") {
                actualizarSemaforo({ color: 'VERDE', riesgo_total: 0, status: 'REGISTRO OK' });
                addMessage("✅ " + reporte.mensaje, 'bot');
            } else if (reporte.riesgo_total !== undefined) {
                actualizarSemaforo(reporte);
                addMessage("🔧 " + reporte.mensaje, 'bot');
            } else {
                addMessage(reporte.mensaje || "Respuesta recibida.", 'bot');
            }

        } catch (error) {
            console.error("Error en el fetch:", error);
            removeMessage(loadingId); 
            addMessage("❌ Error: " + error.message, 'bot');
        }
    }

    function actualizarSemaforo(data) {
       
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        
        const color = data.color ? data.color.toLowerCase() : 'verde';
        const puntos = data.riesgo_total !== undefined ? data.riesgo_total : 0;
        

        if(color === 'rojo') document.getElementById('light-red').classList.add('active');
        else if(color === 'amarillo') document.getElementById('light-yellow').classList.add('active');
        else document.getElementById('light-green').classList.add('active');

        document.getElementById('scoreDisplay').innerText = puntos + " pts";
  
        let status = "OPERATIVO";
        if(data.status) status = data.status;
        else if(color === 'rojo') status = "RIESGO CRÍTICO";
        else if(color === 'amarillo') status = "PRECAUCIÓN";
        
        document.getElementById('statusText').innerText = status;
        document.getElementById('statusText').style.color = (color === 'rojo') ? '#d9534f' : '#555';
    }

    function addMessage(text, sender, isLoading = false) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        div.innerHTML = text; 
        if(isLoading) div.id = "loading-" + Date.now();
        
        const history = document.getElementById('chatHistory');
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
        return div.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if(el) el.remove();
    }

    function handleEnter(e) {
        if (e.key === 'Enter') enviarMensaje();
    }