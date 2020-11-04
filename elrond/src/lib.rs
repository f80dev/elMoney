
#![no_std]
#![allow(clippy::string_lit_as_bytes)]

imports!();

#[elrond_wasm_derive::contract(SimpleErc20TokenImpl)]
pub trait SimpleErc20Token {

    // name
    // #[view(name)]
    // #[storage_get("name")]
    // fn get_name(&self) -> BigUint;
    // #[storage_set("name")]
    // fn set_name(&self, name: &BigUint);


    /// Total number of tokens in existence.
    #[view(totalSupply)]
    #[storage_get("total_supply")]
    fn get_total_supply(&self) -> BigUint;
    #[storage_set("total_supply")]
    fn set_total_supply(&self, total_supply: &BigUint);



    /// Gets the balance of the specified address.
    /// 
    /// Arguments:
    /// 
    /// * `address` The address to query the the balance of
    /// 
    #[view(balanceOf)]
    #[storage_get_mut("balance")]
    fn get_mut_balance(&self, address: &Address) -> mut_storage!(BigUint);

    #[storage_set("balance")]
    fn set_balance(&self, address: &Address, balance: &BigUint);

    /// The amount of tokens that an owner allowed to a spender.
    /// 
    /// Arguments:
    /// 
    /// * `owner` The address that owns the funds.
    /// * `spender` The address that will spend the funds.
    /// 
    #[view(allowance)]
    #[storage_get_mut("allowance")]
    fn get_mut_allowance(&self, owner: &Address, spender: &Address) -> mut_storage!(BigUint);

    #[storage_set("allowance")]
    fn set_allowance(&self, owner: &Address, spender: &Address, allowance: &BigUint);

    // FUNCTIONALITY

    /// Constructor, is called immediately after the contract is created
    /// Will set the fixed global token supply and give all the supply to the creator.
    #[init]
    fn init(&self, total_supply: &BigUint) {
        let creator = self.get_caller();

        // save total supply
        self.set_total_supply(total_supply);

        // save name
        // self.set_name(name);

        // deployer initially receives the total supply
        let mut creator_balance = self.get_mut_balance(&creator);
        *creator_balance += total_supply;
    }


    /// This method is private, deduplicates logic from transfer and transferFrom.
    fn perform_transfer(&self, sender: Address, recipient: Address, amount: BigUint) -> SCResult<()> {        
        // check if enough funds & decrease sender balance
        {
            let mut sender_balance = self.get_mut_balance(&sender);
            if amount > *sender_balance {
                return sc_error!("insufficient funds");
            }
            
            *sender_balance -= &amount; // saved automatically at the end of scope
        }

        // increase recipient balance
        {
            let mut recipient_balance = self.get_mut_balance(&recipient);
            *recipient_balance += &amount; // saved automatically at the end of scope
        }
    
        // log operation
        self.transfer_event(&sender, &recipient, &amount);

        Ok(())
    }

    /// Transfer token to a specified address from sender.
    /// 
    /// Arguments:
    /// 
    /// * `to` The address to transfer to.
    /// 
    #[endpoint]
    fn transfer(&self, to: Address, amount: BigUint) -> SCResult<()> {
        // the sender is the caller
        let sender = self.get_caller();
        self.perform_transfer(sender, to, amount)
    }
 
    /// Use allowance to transfer funds between two accounts.
    /// 
    /// Arguments:
    /// 
    /// * `sender` The address to transfer from.
    /// * `recipient` The address to transfer to.
    /// * `amount` the amount of tokens to be transferred.
    /// 
    #[endpoint(transferFrom)]
    fn transfer_from(&self, sender: Address, recipient: Address, amount: BigUint) -> SCResult<()> {
        // get caller
        let caller = self.get_caller();

        // load allowance
        let mut allowance = self.get_mut_allowance(&sender, &caller);

        // amount should not exceed allowance
        if amount > *allowance {
            return sc_error!("allowance exceeded");
        }

        // update allowance
        *allowance -= &amount; // saved automatically at the end of scope

        // transfer
        self.perform_transfer(sender, recipient, amount)
    }

    /// Approve the given address to spend the specified amount of tokens on behalf of the sender.
    /// It overwrites any previously existing allowance from sender to beneficiary.
    /// 
    /// Arguments:
    /// 
    /// * `spender` The address that will spend the funds.
    /// * `amount` The amount of tokens to be spent.
    /// 
    #[endpoint]
    fn approve(&self, spender: Address, amount: BigUint) -> SCResult<()> {
        // sender is the caller
        let caller = self.get_caller();

        // store allowance
        self.set_allowance(&caller, &spender, &amount);
      
        // log operation
        self.approve_event(&caller, &spender, &amount);
        Ok(())
    }

    // EVENTS

    #[event("0x0000000000000000000000000000000000000000000000000000000000000001")]
    fn transfer_event(&self,
        sender: &Address,
        recipient: &Address,
        amount: &BigUint);

    #[event("0x0000000000000000000000000000000000000000000000000000000000000002")]
    fn approve_event(&self,
        sender: &Address,
        recipient: &Address,
        amount: &BigUint);

}
