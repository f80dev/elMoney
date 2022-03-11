from solana.rpc.api import Client


class SolanaAPI:
    def __init__(self,network="devnet"):
        self.api = Client("https://api."+network+".solana.com")

