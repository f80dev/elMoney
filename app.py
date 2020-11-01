from flask import Flask
from elrondTools import ElrondNet

app = Flask(__name__)
bc=ElrondNet(contract_addr="erd1qqqqqqqqqqqqqpgq6v5n4lrjqrsdtkv6jzcrmxvet3r55tj49e3sk2ctas")

@app.route('/')
def hello_world():
    bc.getBalance()


if __name__ == '__main__':
    app.run()
