#!/bin/bash
kubectl apply -f miniforum-persistent-volume.yaml
kubectl apply -f miniforum-configmap.yaml
kubectl apply -f miniforum-statefulset.yaml
kubectl apply -f miniforum-postgres-service.yaml
kubectl apply -f miniforum-deploy.yaml
kubectl apply -f miniforum-service.yaml