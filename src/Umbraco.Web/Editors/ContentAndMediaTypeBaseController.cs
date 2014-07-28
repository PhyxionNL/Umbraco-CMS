﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Web.Http;
using Newtonsoft.Json;
using Umbraco.Core;
using Umbraco.Web.Models.ContentEditing;
using Umbraco.Web.Mvc;

namespace Umbraco.Web.Editors
{
    /// <summary>
    /// Am abstract API controller providing functionality used for dealing with content and media types
    /// </summary>
    [PluginController("UmbracoApi")]    
    public abstract class ContentAndMediaTypeBaseController : UmbracoAuthorizedJsonController
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public ContentAndMediaTypeBaseController()
            : this(UmbracoContext.Current)
        {            
        }

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="umbracoContext"></param>
        public ContentAndMediaTypeBaseController(UmbracoContext umbracoContext)
            : base(umbracoContext)
        {
        }

        /// <summary>
        /// Returns the container configuration JSON structure for the content item id passed in
        /// </summary>
        /// <param name="contentId"></param>
        public ContentTypeContainerConfiguration GetContainerConfig(int contentId)
        {
            var contentItem = Services.ContentService.GetById(contentId);            
            if (contentItem == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            if (!string.IsNullOrEmpty(contentItem.ContentType.ContainerConfig))
            {
                var containerConfig = JsonConvert.DeserializeObject<ContentTypeContainerConfiguration>(contentItem.ContentType.ContainerConfig);
                containerConfig.AdditionalColumns = new List<ContentTypeContainerConfiguration.AdditionalColumnDetail>();

                // Populate the column headings and localization keys                
                if (!string.IsNullOrEmpty(containerConfig.AdditionalColumnAliases))
                {
                    // Find all the properties for doc types that might be in the list
                    var allowedContentTypeIds = contentItem.ContentType.AllowedContentTypes
                        .Select(x => x.Id.Value)
                        .ToArray();
                    var allPropertiesOfAllowedContentTypes = Services.ContentTypeService
                        .GetAllContentTypes(allowedContentTypeIds)
                        .SelectMany(x => x.PropertyTypes)
                        .ToList();

                    foreach (var alias in containerConfig.AdditionalColumnAliases.Split(','))
                    {
                        var column = new ContentTypeContainerConfiguration.AdditionalColumnDetail
                        {
                            Alias = alias,                            
                        };

                        // Try to find heading from custom property (getting the name from the alias)
                        // - need to look in children of the current content's content type
                        var property = allPropertiesOfAllowedContentTypes
                            .FirstOrDefault(x => x.Alias == alias.ToFirstLower());
                        if (property != null)
                        {
                            column.Header = property.Name;
                            column.LocalizationKey = string.Empty;
                        }
                        else if (alias == "UpdateDate")
                        {
                            // Special case to restore hard-coded column titles
                            column.Header = "Last edited";
                            column.LocalizationKey = "defaultdialogs_lastEdited";
                        }
                        else if (alias == "Owner")
                        {
                            // Special case to restore hard-coded column titles (2)
                            column.Header = "Updated by";
                            column.LocalizationKey = "content_updatedBy";
                        }
                        else
                        {
                            // Otherwise just sentence case the alias
                            column.Header = alias.ToFirstUpper().SplitPascalCasing();
                            column.LocalizationKey = "content_" + alias.ToFirstLower();
                        }

                        containerConfig.AdditionalColumns.Add(column);
                    }
                }

                return containerConfig;
            }

            return null;
        }
    }
}