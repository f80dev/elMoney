import base64
import os
import ssl
import sys

from flask import Flask, Response, request, jsonify
from flask_cors import CORS

from Tools import base_10_to_alphabet
from elrondTools import ElrondNet

app = Flask(__name__)
CORS(app)
bc=ElrondNet()


#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<contract>/<dest>/<amount>/',methods=["POST"])
def transfer(contract:str,dest:str,amount:str):
    pem_body=str(base64.b64decode(str(request.data).split("base64,")[1]),encoding="utf-8")
    with open("./PEM/temp.pem", "w") as pem_file:pem_file.write(pem_body)

    bc.set_contract(contract)
    rc=bc.transfer("./PEM/temp.pem",dest,int(amount))

    os.remove("./PEM/temp.pem")
    url="https://testnet-explorer.elrond.com/transactions/"+rc["tx"]
    print(url)
    return jsonify({"from_addr":str(rc["from"].bech32()),
                    "tx":url})



@app.route('/api/deploy/<unity>/<amount>/',methods=["POST"])
def deploy(unity:str,amount:str):
    pem_body = str(base64.b64decode(str(request.data).split("base64,")[1]), encoding="utf-8")
    with open("./PEM/temp.pem", "w") as pem_file: pem_file.write(pem_body)
    result=bc.deploy("./static/RV_coin.wasm","./PEM/temp.pem",unity,int(amount))
    if "error" in result:
        return jsonify(result), 500
    else:
        return jsonify(result),200



#test http://localhost:5000/api/balance/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx/
@app.route('/api/balance/<contract>/<addr>/')
def getbalance(contract:str,addr:str):
    bc.set_contract(contract)
    rc = bc.getBalance(addr)
    return Response(str(rc), 200)


@app.route('/api/name/<contract>/')
def getname(contract:str):
    bc.set_contract(contract)
    name=bc.getName()
    rc = base_10_to_alphabet(name)
    return jsonify({"name":rc}), 200






if __name__ == '__main__':
    _port=5555
    if len(sys.argv)>2:
        _port = sys.argv[1]

    if "debug" in sys.argv:
        app.run(host="0.0.0.0", port=_port, debug=True)
    else:
        if "ssl" in sys.argv:
            context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            context.load_cert_chain("/app/certs/fullchain.pem", "/app/certs/privkey.pem")
            app.run(host="0.0.0.0", port=_port, debug=False, ssl_context=context)
        else:
            app.run(host="0.0.0.0", port=_port, debug=False)


