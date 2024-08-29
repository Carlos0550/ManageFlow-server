require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { v4: uuidv4 } = require('uuid');
const clientSupabase = require("./DbConfiguration/supabaseClient.js")

const app = express()
const port = process.env.PORT || 4000
app.use(express.json())
app.use(cors())
app.get("/", (req,res)=>{
    res.send("Servidor ON")
})


app.post("/create-client", async (req, res) => {
    const { parsedValues } = req.body;

    let initDate = new Date().toISOString().split("T")[0]; 
    let endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); 
    endDate = endDate.toISOString().split("T")[0];

    const uuidGenerated = uuidv4();

    const query1 = 'INSERT INTO clientes(id_cliente, datos_cliente) VALUES($1, $2)';
    const query2 = 'INSERT INTO membresias(user_id, start_date, end_date, status) VALUES($1, $2, $3, $4)';

    const arrayQuery1 = [uuidGenerated, parsedValues];
    const arrayQuery2 = [uuidGenerated, initDate, endDate, 'activa'];

    if (parsedValues) {
        try {
            await clientSupabase.query("BEGIN");
            const response1 = await clientSupabase.query(query1, arrayQuery1);
            const response2 = await clientSupabase.query(query2, arrayQuery2);

            await clientSupabase.query("COMMIT");

            if (response1.rowCount > 0 && response2.rowCount > 0) {
                return res.status(200).json({ message: "Cliente y membresía guardados exitosamente" });
            } else {
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


app.listen(port, ()=>{
    console.log(`Servidor levantado en ${port}`)
})

