cd elMoneyAppli
start npm run prod

cd ..
docker build -t f80hub/elmoney .
docker push f80hub/elmoney:latest

echo "Déployment terminer, poussez sur github"

echo "Déployer l'image sur le serveur via docker rm -f elmoney && docker pull f80hub/elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 devnet ssl"
start putty -load MainServer -l root