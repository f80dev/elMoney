from api.metaplex_api import MetaplexAPI

class MetaplexNet:
    """
    Instance de création de Token Solana
    voir https://github.com/metaplex-foundation/python-api
    """

    def __init__(self,network="devnet"):
        self.api=Client("https://api."+network+".solana.com",timeout=600)


    def mint(self,payer:Keypair,mintAuthority:str=None,owner:str=None,amount=1):
        """
        :param pubkey:
        :param program_id:
        :param payer:
        :return:
        """
        mintAuthority=payer.public_key if mintAuthority is None else PublicKey(mintAuthority)
        owner=payer.public_key if owner is None else PublicKey(owner)

        tk=Token(self.api,mintAuthority,program_id=TOKEN_PROGRAM_ID,payer=payer)
        token=tk.create_mint(self.api,
                         mint_authority=mintAuthority,
                         freeze_authority=mintAuthority,
                         decimals=0,
                         program_id=TOKEN_PROGRAM_ID,
                         payer=payer,
                         skip_confirmation=False)

        mint_info=token.get_mint_info()
        if amount>0:
            token.create_associated_token_account(owner=owner)
            tx_opts=TxOpts(skip_confirmation=False,max_retries=3)
            tk.mint_to(owner,mint_authority=mintAuthority,amount=amount,opts=tx_opts)

        return mint_info

    def account(self, name):
        s=open("./PEM/"+name+".json","r").readlines()[0]
        ints=s.replace("[","").replace("]","").replace("\n","").split(",")

        rc=bytearray(64)
        for i in range(len(ints)):
            rc[i]=int(ints[i])

        rc=Keypair.from_secret_key(bytes(rc[0:32]))
        return rc


