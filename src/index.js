require("dotenv").config()
const express = require("express")
const cors = require("cors")
const cron = require("node-cron")
const { v4: uuidv4 } = require('uuid');
const clientSupabase = require("./DbConfiguration/supabaseClient.js")

const app = express()
const port = process.env.PORT || 4000
app.use(express.json())
app.use(cors())
app.get("/", (req,res)=>{
    res.send("Servidor ON")
})


let initDate = new Date().toISOString().split("T")[0]; 
let endDate = new Date();
endDate.setMonth(endDate.getMonth() + 1); 
endDate = endDate.toISOString().split("T")[0];

app.post("/create-client", async (req, res) => {
    const { parsedValues, valorCuota } = req.body;


    const uuidGenerated = uuidv4();
    const dataQuery3 = {
        entrega: valorCuota,
        fecha_entrega: initDate
    }

    const query1 = 'INSERT INTO clientes(id_cliente, datos_cliente) VALUES($1, $2)';
    const query2 = 'INSERT INTO membresias(id_cliente, start_date, end_date, status) VALUES($1, $2, $3, $4)';
    const query3 = 'INSERT INTO entregas(id_cliente,detalle_entrega) VALUES ($1, $2)'

    const arrayQuery1 = [uuidGenerated, parsedValues];
    const arrayQuery2 = [uuidGenerated, initDate, endDate, 'activa'];
    const arrayQuery3 = [uuidGenerated, dataQuery3]

    if (parsedValues) {
        try {
            await clientSupabase.query("BEGIN");
            const response1 = await clientSupabase.query(query1, arrayQuery1);
            const response2 = await clientSupabase.query(query2, arrayQuery2);
            const response3 = await clientSupabase.query(query3, arrayQuery3)

            if (response1.rowCount > 0 && response2.rowCount > 0 && response3.rowCount > 0) {
                await clientSupabase.query("COMMIT");
                return res.status(200).json({ message: "Cliente y membresía guardados exitosamente" });
            } else {
                await clientSupabase.query("ROLLBACK");
                return res.status(406).json({ message: "Hubo un problema y no se pudo guardar el cliente o la membresía" });
            }
        } catch (error) {
            await clientSupabase.query("ROLLBACK");
            console.error("Error al guardar el cliente y la membresía:", error);
            return res.status(500).json({ message: "Error interno del servidor: no se pudo guardar el cliente o la membresía" });
        }
    } else {
        return res.status(400).json({ message: "Los datos del cliente no son válidos o están incompletos" });
    }
});


app.get("/get-clients", async(req,res)=>{
    const query = 'SELECT * FROM vista_clientes_membresias'
    try {
        const response = await clientSupabase.query(query)
        
        if (response.rows) {
            return res.status(200).send(response.rows)
        }else{
            return res.status(400).json({message: "No se pudieron traer los clientes de la base de datos"})
        }
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Error interno del servidor: No se pudo traer los clientes de la base de datos"})
    }
});

app.put("/toggleLinkClient", async(req,res) =>{
    const {id_cliente, state} = req.body.toggleValues;
    const query = "UPDATE clientes SET enabled = $1 WHERE id_cliente = $2"
    const arrayQuery = [state, id_cliente]
    try {
        const response = await clientSupabase.query(query,arrayQuery)
        console.log(response)
        if (response.rowCount > 0) {
            return res.status(200).json({message: "OK"})
        }else{
            return res.status(400).json({message: "Hubo un error y no se pudo habilitar el link"})
        }
    } catch (error) {
        console.warn(error)
        return res.status(500).json({message: "Error interno del servidor, por favor intente nuevamente más tarde"})
    }
    
})

app.get("/show-client-info", async (req, res) => {
    const { user_id } = req.query;
    console.log(user_id);
    const query = 'SELECT * FROM vista_clientes_membresias WHERE id_cliente = $1 AND enabled = TRUE';
    try {
        const response = await clientSupabase.query(query, [user_id]);
        console.log(response);
        if (response.rows.length > 0) {
            return res.status(200).json(response.rows);
        } else {
            return res.status(400).json({ message: "Link deshabilitado o expirado" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error interno del servidor, no se pudo mostrar los datos del cliente" });
    }
});

app.put("/update-data-client", async(req,res)=>{
    const {values, userID} = req.body.values
    const query = 'UPDATE clientes SET datos_cliente = $1 WHERE id_cliente = $2'
    try {
        const result = await clientSupabase.query(query, [JSON.stringify(values), userID])
        if (result.rowCount > 0) {
            return res.status(200).json({message: "Usuario actualizado!"})
        }else{
            return res.status(500).json({message: "Hubo un error al actualizar el cliente"})
        }
    } catch (error) {
        console.error("Error: ",error);
        return res.status(500).json({ message: "Error interno del servidor, no se pudo mostrar los datos del cliente" });
    }
});

app.delete("/delete-client", async (req, res) => {
    const { id_cliente } = req.query;
    console.log(id_cliente);

    const query1 = 'DELETE FROM clientes WHERE id_cliente = $1';
    const query2 = 'DELETE FROM membresias WHERE id_cliente = $1';
    const query3 = 'DELETE FROM entregas WHERE id_cliente = $1'

    try {
        await clientSupabase.query("BEGIN");
        const response3 = await clientSupabase.query(query3, [id_cliente])
        const response2 = await clientSupabase.query(query2, [id_cliente]);
        const response1 = await clientSupabase.query(query1, [id_cliente]);
        
        console.log("Respuest1: ", response1)
        console.log("Respuest2: ", response2)
        console.log("Respuest2: ", response2)

        if (response1.rowCount > 0 || response2.rowCount > 0 || response3.rowCount > 0) {
            await clientSupabase.query("COMMIT");
            return res.status(200).json({ message: "Cliente eliminado exitosamente!" });
        } else {
            await clientSupabase.query("ROLLBACK");
            return res.status(400).json({ message: "Hubo un error y no se pudo eliminar el cliente" });
        }

    } catch (error) {
        await clientSupabase.query("ROLLBACK"); 
        console.log(error);
        return res.status(500).json({ message: "Error interno del servidor: no se pudo eliminar el cliente" });
    }
});


cron.schedule('22 20 * * *', async () => {
    console.log('Ejecutando tarea cron para actualizar estados de entregas...');
    const query = "UPDATE membresias SET status = 'vencido' WHERE end_date <= CURRENT_DATE";
    
    try {
        const result = await clientSupabase.query(query);
        console.log(`Se actualizaron ${result.rowCount} filas a 'vencido'.`);
    } catch (error) {
        console.error('Error al ejecutar la tarea cron:', error);
    }
});

app.post("/make-deliver", async(req,res)=>{
    const {clientID, value} = req.body

    
    
    const query1 = 'UPDATE entregas SET detalle_entrega = $1 WHERE id_cliente = $2'
    const query2 = "UPDATE membresias SET status = 'activa', end_date = $1 WHERE id_cliente = $2"
    
    try {
        await clientSupabase.query("BEGIN")
        const response1 = await clientSupabase.query(query1, [value, clientID])
        const response2 = await clientSupabase.query(query2, [endDate,clientID])

        if (response1.rowCount > 0 || response2.rowCount > 0) {
            await clientSupabase.query("COMMIT")
            return res.status(200).json({message:"Membresia Actualizada!"})
        }else{
            await clientSupabase.query("ROLLBACK")
            return res.status(400).json({message: "Entrega guardada y membresía actualizada!"})
        }
    } catch (error) {
        await clientSupabase.query("ROLLBACK"); 
        console.log(error);
        return res.status(500).json({ message: "Error interno del servidor: guardar la entrega ni reiniciar la membresía" });
    }
})


app.listen(port, ()=>{
    console.log(`Servidor levantado en ${port}`)
})

