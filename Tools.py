def read_args(args):
    parser = ArgumentParser()
    parser.add_argument("--proxy", help="Testnet Proxy URL", default=config.get_proxy())
    parser.add_argument("--contract", help="Existing contract address")
    parser.add_argument("--pem", help="PEM file", required=True)
    return parser.parse_args()
