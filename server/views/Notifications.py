from django.http import JsonResponse
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.renderers import JSONRenderer
from server.models import WfModule

@api_view(['DELETE'])
@renderer_classes((JSONRenderer,))
def notifications_delete_by_wfmodule(request, pk, format=None):
    try:
        wf_module = WfModule.objects.get(pk=pk)
    except WfModule.DoesNotExist:
        return HttpResponseNotFound()

    if not wf_module.user_authorized_write(request.user):
        return HttpResponseForbidden()

    notification_list = wf_module.notification_set.all()
    deleted_num, deleted_list = notification_list.delete()
    return JsonResponse(deleted_list, status=200)
