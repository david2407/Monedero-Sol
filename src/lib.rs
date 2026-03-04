use anchor_lang::prelude::*;

declare_id!("6AokzEwMeoCBwH1Lmyxi2qxhLBffPMdTNMHwcjVUV23z");

#[program] // El codigo empieza desde aqui
pub mod monedero {
    use super::*; // Importa todas los structs y enums definidos fuera del modulo

    /////////////////////////// INSTRUCCIONES ///////////////////////////
    /////////////////////////// Crear Biblioteca ///////////////////////////
    pub fn crear_monedero(context: Context<NuevoMonedero>, n_monedero: String) -> Result<()> {
        let owner_id = context.accounts.owner.key(); // caller wallet

        let dineros = Vec::<Pubkey>::new(); // crear un vector vacio

        context.accounts.monedero.set_inner(Monedero {
            owner: owner_id,
            n_monedero: n_monedero.clone(),
            dineros,
        }); // crear el struct de monedero, lo serializa y lo guarda en el espacio de la cuenta (su uso se recomienda cuando se crea una cuenta)

        msg!(
            "Monedero {}, creado exitosamente!. Owner id: {}",
            n_monedero.clone(),
            owner_id
        ); // Log de verificacion

        Ok(())
    }

    /////////////////////////// Nuevo Libro ///////////////////////////
    pub fn agregar_dinero(
        context: Context<NuevoDinero>,
        nombre: String,
        cantidad: u64,
    ) -> Result<()> {
        require!(
            context.accounts.monedero.owner == context.accounts.owner.key(),
            Errores::NoEresElOwner
        ); // Medida de seguridad

        let dinero = Dinero {
            monedero: context.accounts.monedero.n_monedero.clone(),
            nombre: nombre.clone(),
            cantidad,
            disponible: true,
        }; // Creacion del struct libro

        context.accounts.dinero.set_inner(dinero); // Serializa y guarda el struct en el espacio de la cuenta

        context
            .accounts
            .monedero
            .dineros
            .push(context.accounts.dinero.key()); // Agrega el PDA del libro al vector de libros de biblioteca

        msg!(
            "Dinero {}, creado exitosamente, en el monedero {}!. Owner id: {}",
            nombre.clone(),
            context.accounts.monedero.n_monedero,
            context.accounts.owner.key()
        ); // Log de verificacion

        Ok(())
    }

    /////////////////////////// Eliminar Libro ///////////////////////////
    pub fn eliminar_dinero(context: Context<EliminarDinero>, nombre: String) -> Result<()> {
        require!(
            context.accounts.monedero.owner == context.accounts.owner.key(),
            Errores::NoEresElOwner
        ); // Medida de seguridad

        let monedero = &mut context.accounts.monedero;
        let dineros = &monedero.dineros;

        // Verificar que el libro pertenece a esta biblioteca
        require!(
            context.accounts.dinero.monedero == monedero.n_monedero,
            Errores::DineroNoPertenece
        );

        require!(
            monedero.dineros.contains(&context.accounts.dinero.key()),
            Errores::DineroNoExiste
        );

        let mut pos = 0;

        for i in 0..dineros.len() {
            if dineros[i] == context.accounts.dinero.key() {
                pos = i;
                break;
            }
        }

        // Alternativa mas directa:
        // let pos = biblioteca
        //     .libros
        //     .iter()
        //     .position(|&x| x == context.accounts.libro.key())
        //     .ok_or(Errores::LibroNoExiste)?;

        monedero.dineros.remove(pos);

        // La cuenta del libro se cierra automáticamente por Anchor debido a 'close = owner'
        msg!(
            "Dinero '{}' eliminado exitosamente del monedero {}!. Owner id: {}",
            nombre,
            monedero.n_monedero,
            context.accounts.owner.key()
        );

        Ok(())
    }

    /////////////////////////// Alternar Estado ///////////////////////////
    pub fn alternar_estado(context: Context<ModificarDinero>, nombre: String) -> Result<()> {
        require!(
            context.accounts.monedero.owner == context.accounts.owner.key(),
            Errores::NoEresElOwner
        );

        let dinero = &mut context.accounts.dinero;
        let estado = dinero.disponible;
        let nuevo_estado = !estado;
        dinero.disponible = nuevo_estado;

        msg!(
            "El dinero: {} ahora tiene un valor de disponibilidad: {}",
            nombre,
            nuevo_estado
        );

        Ok(())
    }
}
/////////////////////////// Codigos de Error ///////////////////////////
#[error_code]
pub enum Errores {
    #[msg("Error, no eres el propietario de la monedera que deseas modificar")]
    NoEresElOwner,
    #[msg("Error, el dinero con el que deseas interactuar no existe")]
    DineroNoExiste,
    #[msg("Error, el dinero no pertenece a esta monedera")]
    DineroNoPertenece,
}

/////////////////////////// CUENTAS ///////////////////////////
/////////////////////////// Monedero ///////////////////////////

#[account]
#[derive(InitSpace)]
pub struct Monedero {
    pub owner: Pubkey,

    #[max_len(60)]
    pub n_monedero: String,

    #[max_len(10)]
    pub dineros: Vec<Pubkey>,
}

/////////////////////////// Libro ///////////////////////////

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct Dinero {
    #[max_len(60)]
    pub monedero: String,

    #[max_len(60)]
    pub nombre: String,

    pub cantidad: u64,

    pub disponible: bool,
}

/////////////////////////// CONTEXTOS ///////////////////////////
/////////////////////////// Nuevo Monedero ///////////////////////////
/// Instruccion: crear_monedero

#[derive(Accounts)]
#[instruction(n_monedero:String)]
pub struct NuevoMonedero<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner, 
        space = 8 + Monedero::INIT_SPACE, 
        seeds = [b"monedero", n_monedero.as_bytes(), owner.key().as_ref()],
        bump
    )]
    pub monedero: Account<'info, Monedero>,

    pub system_program: Program<'info, System>,
}

/////////////////////////// NuevoLibro ///////////////////////////
/// Instruccion: agregar_libro

#[derive(Accounts)]
#[instruction(nombre:String)]
pub struct NuevoDinero<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner, 
        space = 8 + Dinero::INIT_SPACE,
        seeds = [b"dinero", nombre.as_bytes(), owner.key().as_ref()],
        bump
    )]
    pub dinero: Account<'info, Dinero>,

    #[account(mut)]
    pub monedero: Account<'info, Monedero>,

    pub system_program: Program<'info, System>,
}

/////////////////////////// Modificar Libro ///////////////////////////
/// Instruccion: alternar_estado (tambien puede servir para funciones relacionadas con cambiar nombre, numero de paginas o alguna otra variable contenida en el struct Lbro)

#[derive(Accounts)]
pub struct ModificarDinero<'info> {
    pub owner: Signer<'info>,

    #[account(mut)]
    pub dinero: Account<'info, Dinero>,

    #[account(mut)]
    pub monedero: Account<'info, Monedero>,
}

/////////////////////////// Eliminar Libro ///////////////////////////
///  Instruccion: eliminar_libro -> cierra la cuenta

#[derive(Accounts)]
pub struct EliminarDinero<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        constraint = dinero.monedero == monedero.n_monedero @ Errores::DineroNoPertenece
    )]
    pub dinero: Account<'info, Dinero>,

    #[account(mut)]
    pub monedero: Account<'info, Monedero>,
}
