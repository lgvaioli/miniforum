#!/bin/bash
kubectl delete deployment miniforum
kubectl delete service miniforum-service
kubectl delete service postgres-service
kubectl delete persistentvolume miniforum-persistent-volume
kubectl delete persistentvolumeclaim miniforum-persistent-volume-claim
kubectl delete statefulset miniforum-statefulset
kubectl delete configmap miniforum-configmap