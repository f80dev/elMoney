cd elMoneyAppli
start npm run dev

cd ..
docker build -t f80hub/elmoney-dev .
docker push f80hub/elmoney-dev:latest

echo "Déployment terminer, poussez sur github"

echo "Déployer l'image sur le serveur via docker rm -f elmoney-dev && docker pull f80hub/elmoney-dev && docker run --restart=always -v /root/certs:/certs -p 7777:7777 --name elmoney-dev -d f80hub/elmoney-dev:latest python3 app.py 7777 devnet coinmaker ssl"
start putty -load MainServer -l root