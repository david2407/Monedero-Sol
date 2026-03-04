//////////////////// Imports ////////////////////
import { PublicKey } from "@solana/web3.js";

////////////////// Constantes ////////////////////
const n_monedero = "David wallet"; // Nombre de la biblioteca
const owner = pg.wallet.publicKey; // Wallet

//////////////////// Client Test Logs ////////////////////
console.log("My address:", owner.toString()); // Ver el adress
const balance = await pg.connection.getBalance(owner);
console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`); // Ver el la cantidad de tokens de solana

//////////////////// FUNCIONES ////////////////////

//////////////////// OBTENER PDAs ////////////////////
/*
Un PDA representa una cuenta que es controlada por un programa (smart contract), y una de sus principales caracteristicas es no contar 
con una clave privada con la cual firmar al momento de realizar alguna transaccion (transferencia, escritura o modificacion de un dato) 
dentro del contrato. En su lugar, emplea direcciones generadas deterministicamente, es decir, recreables a partir de semillas. 
Las semillas pueden ser varias y de diferentes tipos, puede depender desde un valor predefenidio (como es usualmente el valor de la semilla 1), 
hasta de direcciones secundarias (como la del caller u otra cuenta).

Es por ello que para llamar desde el front una funcion del Solana Program desplegado es necesario contar con las semillas en su orden y tipo 
correspondiente. Se recomienda no usar valores sencillos (que no solo dependan de valores predefinidos), pero tampoco se encuentren 
compuestas de valores redundantes (como el program id o alguna cuenta padre).
*/
//////////////////// Biblioteca ////////////////////
function pdaMonedero(n_monedero) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("monedero"), // Semilla 1: b"biblioteca"
      Buffer.from(n_monedero), // Semilla 2: nombre de la biblioteca  -> String
      owner.toBuffer(), // Semilla 3: wallet -> Pubkey
    ],
    pg.PROGRAM_ID // Program ID: Siempre va al final
  );
}
//////////////////// Libro ////////////////////
function pdaDinero(n_dinero) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("dinero"), // Semilla 1: b"libro"
      Buffer.from(n_dinero), // Semilla 2: nombre del libro: -> String
      owner.toBuffer(), // Semilla 3: wallet -> Pubkey
    ],
    pg.PROGRAM_ID // Program ID: Siempre va al final
  );
}

//////////////////// Crear Biblioteca ////////////////////
// Para crear la biblioteca solo es necesario el nombre que tendra
async function crearMonedero(n_monedero) {
  const [pda_monedero] = pdaMonedero(n_monedero); // Primero se obtiene la cuenta de la biblioteca

  const txHash = await pg.program.methods // mediante la libreria pg (solana playground) se acceden a los metodos del programa
    .crearMonedero(n_monedero) // crear biblioteca
    .accounts({
      // Se agregan las cuentas de las que depende (Contexto del struct NuevaBiblioteca)
      owner: owner,
      monedero: pda_monedero,
    })
    .rpc();

  console.log("txHash: ", txHash);
}

//////////////////// Agregar Libro ////////////////////
// Para crear un libro solo es necesario pasar el libro y el numero de paginas. El estado se define automaticamente en el programa
async function agregarDinero(n_dinero, cantidad) {
  // Agregar Libro
  const [pda_dinero] = pdaDinero(n_dinero); // se determina la cuenta del libro
  const [pda_monedero] = pdaMonedero(n_monedero);
  const value = new anchor.BN(cantidad); // se obtiene la cuenta de la biblioteca

  const txHash = await pg.program.methods
    .agregarDinero(n_dinero, value) // agregar_libro
    .accounts({
      // cuentas del contexto
      owner: owner,
      dinero: pda_dinero,
      monedero: pda_monedero,
    })
    .rpc();

  console.log("txHash: ", txHash);
}

//////////////////// Alternar estado ////////////////////
// Para cambiar el estado de true a false o visceversa solo se necesita el nombre del libro
async function cambiarEstado(n_dinero) {
  // Modificar Libro
  const [pda_dinero] = pdaDinero(n_dinero); // se determina la cuenta del libro
  const [pda_monedero] = pdaMonedero(n_monedero); // se obtiene la cuenta de la biblioteca

  const txHash = await pg.program.methods
    .alternarEstado(n_monedero) // alternar_estado
    .accounts({
      // cuentas del contexto
      owner: owner,
      dinero: pda_dinero,
      monedero: pda_monedero,
    })
    .rpc();

  console.log("txHash: ", txHash);
}

//////////////////// Eliminar Libro ////////////////////
// Para eliminar un libro solo es necesario proporcionar el nombre del libro a eliminar de la biblioteca
async function eliminarDinero(n_dinero) {
  // Eliminar Libro
  const [pda_dinero] = pdaDinero(n_dinero); // se determina la cuenta del libro
  const [pda_monedero] = pdaMonedero(n_monedero); // se obtiene la cuenta de la biblioteca
  const txHash = await pg.program.methods
    .eliminarDinero(n_dinero) // eliminar_libro
    .accounts({
      // cuentas del contexto
      owner: owner,
      dinero: pda_dinero,
      monedero: pda_monedero,
    })
    .rpc();

  console.log("txHash: ", txHash);
}

//////////////////// Ver Libros ////////////////////
/*
 Anteriormente, en la version anterior de la biblioteca, esta instruccion se encotraba implementada dentro del Solana Program, pero... ¿porque ya no?
 En la prinmera version de la biblioteca los libros eran structs contenidos en un vector dentro de la cuenta biblioteca. Al ser elementos de un vector 
 su visualizacion era mas simple. En este caso, cada libro se encuentra definido por una cuenta, por lo que visualizar informacion de multiples cuentas 
 desde el Solana Program es ineficiente a comparacion de hacerlo desde el frontend. 

Para lograr hacerlo es necesario realizar los siguientes pasos:

1. Determinar el PDA de la biblioteca 
2. Obtener el vector de libros (direcciones)
3. Por cada direccion, obtener la informacion del libro 
4. Mostrarla con console.log
*/
async function verDineros(n_monedero) {
  // Ver Libros
  const [pda_monedero] = pdaMonedero(n_monedero); // se obtiene la cuenta de la biblioteca

  try {
    // Se accede a los datos de la cuenta (biblioteca)
    const monederoAccount = await pg.program.account.monedero.fetch(
      pda_monedero
    );

    // Mediante el .length se obtiene el tamaño del vector de libros en laa biblioteca
    const numero_dineros = monederoAccount.dineros.length;

    // Se verifican si hay libros en el vector
    if (!monederoAccount.dineros || numero_dineros === 0) {
      console.log("Monedera vacía");
      return;
    }

    // Se imprime el valor en la consola
    console.log("Cantidad de dineros:", numero_dineros);

    // Se itera cada cuenta (libro) del vector (biblioteca) y se obtiene la informacion asociada
    for (let i = 0; i < numero_dineros; i++) {
      const dineroKey = monederoAccount.dineros[i];

      const dineroAccount = await pg.program.account.dinero.fetch(dineroKey);

      // Finaliza mostrando en la terminal la informacion de cada libro
      console.log(
        `Dinero #${i + 1}: \n * Nombre: ${dineroAccount.nombre} \n * Páginas: ${
          dineroAccount.cantidad
        } \n * Monedero: ${dineroAccount.monedero} \n * Disponible: ${
          dineroAccount.disponible
        } \n * Dirección(PDA): ${dineroKey.toBase58()}`
      );
    }
  } catch (error) {
    console.error("Error viendo dineros:", error);

    // Debugging adicional
    if (error.message) {
      console.error("Mensaje de error:", error.message);
    }
    if (error.logs) {
      console.error("Logs del programa:", error.logs);
    }
  }
}

//crearMonedero(n_monedero);
//agregarDinero("USD", 80000);
// eliminarLibro("El alquimista");
// cambiarEstado("El alquimista");
verDineros(n_monedero);

// solana confirm -v <txHash>
