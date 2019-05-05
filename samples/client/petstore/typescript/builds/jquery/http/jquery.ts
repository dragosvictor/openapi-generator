import {HttpLibrary, RequestContext, ResponseContext, HttpException} from './http';
import * as e6p from 'es6-promise'
import { from, Observable } from 'rxjs';
e6p.polyfill();
import * as $ from 'jquery';
import * as FormData from "form-data";
import { resolve } from 'dns';

export class JQueryHttpLibrary implements HttpLibrary {

    public send(request: RequestContext): Observable<ResponseContext> {
        let method = request.getHttpMethod().toString();
        let body = request.getBody();
        let headerParams = request.getHeaders()

        let requestOptions: any = {
            url: request.getUrl(),
            type: method,
            headers: request.getHeaders(),
            processData: false,
            xhrFields: { withCredentials: true }, 
            data: body
        };

        if (request.getHeaders()['Content-Type']) {
            requestOptions.contentType = headerParams['Content-Type'];
        }
        requestOptions.dataFilter = ((headerParams: { [key:string]: string}) => {
            return (data: string, type: string) => {
                if (headerParams["Accept"] == "application/json" && data == "") {
                    return "{}"
                } else {
                    return data
                }
            }
        })(headerParams);
        
        if (request.getHeaders()["Cookie"]) {
            throw new HttpException("Setting the \"Cookie\"-Header field is blocked by every major browser when using jquery.ajax requests. Please switch to another library like fetch to enable this option");
        }

        if (body.constructor.name == "FormData") {
            requestOptions.contentType = false;
        }
        const sentRequest = $.ajax(requestOptions);
        
        const resultPromise = new Promise<ResponseContext>((resolve, reject) => {
            sentRequest.done((resp, _, jqXHR) => {
                const headers = this.getResponseHeaders(jqXHR)
                const result = new ResponseContext(jqXHR.status, headers, JSON.stringify(resp));
                resolve(result);
            })
            sentRequest.fail((jqXHR: any) => {
                const headers = this.getResponseHeaders(jqXHR)
                const result = new ResponseContext(jqXHR.status, headers, jqXHR.responseText);
                resolve(result);
            })    
        })
        return from(resultPromise);
    }

    private getResponseHeaders(jqXHR: any): { [key: string]: string } {
        const responseHeaders: { [key: string]: string } = {};
        var headers = jqXHR.getAllResponseHeaders();
        headers = headers.split("\n");
        headers.forEach(function (header: any) {
          header = header.split(": ");
          var key = header.shift();
          if (key.length == 0) return
          // chrome60+ force lowercase, other browsers can be different
          key = key.toLowerCase(); 
          responseHeaders[key] = header.join(": ");
        });
        return responseHeaders
    }
}
